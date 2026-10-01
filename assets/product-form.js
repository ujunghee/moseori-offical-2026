document.addEventListener('DOMContentLoaded', function() {
  // 제품 폼 요소 찾기
  const productForms = document.querySelectorAll('form[action$="/cart/add"]');
  const miniCart = document.getElementById('miniCart');
  const cartCount = document.querySelector('.cart-count');
  
  // 가격 포맷팅 함수 (스코프 문제 해결을 위해 전역으로 선언)
  window.formatMoney = function(cents) {
    const value = (cents / 100).toFixed(0);
    return '₩' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // variant 옵션 텍스트 생성 함수
  function formatVariantOptions(item) {
    let variantText = '';
    
    // variant_title이 있고 'Default Title'이 아닌 경우
    if (item.variant_title && item.variant_title !== 'Default Title') {
      variantText = item.variant_title;
    } 
    // options 배열이 있는 경우
    else if (item.options && Array.isArray(item.options)) {
      const validOptions = item.options.filter(option => 
        option && 
        option !== 'Default Title' && 
        option.trim() !== ''
      );
      
      if (validOptions.length > 0) {
        variantText = validOptions.join(' / ');
      }
    }
    // option1, option2, option3 개별 필드가 있는 경우
    else {
      const options = [];
      if (item.option1 && item.option1 !== 'Default Title') options.push(item.option1);
      if (item.option2 && item.option2 !== 'Default Title') options.push(item.option2);
      if (item.option3 && item.option3 !== 'Default Title') options.push(item.option3);
      
      if (options.length > 0) {
        variantText = options.join(' / ');
      }
    }
    
    return variantText;
  }
  
  // 아이템 삭제 처리 함수 (전역으로 만들기)
 window.handleRemoveItem = function(event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const itemIndex = button.dataset.itemIndex;
    const itemContainer = button.closest('.cart-popup-item');
    
    if (!itemIndex || !itemContainer) return;
    
    // 삭제 중 상태 표시
    itemContainer.classList.add('item-removing');
    button.style.display = 'none';
    
    // 장바구니에서 아이템 완전히 제거 (수량을 0으로 설정)
    const body = JSON.stringify({
      line: parseInt(itemIndex),
      quantity: 0
    });
    
    fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body
    })
    .then(response => response.json())
    .then(cart => {
      // 장바구니 팝업 업데이트
      window.updateCartPopupContents(cart);
    })
    .catch(error => {
      console.error('장바구니 아이템 삭제 오류:', error);
      itemContainer.classList.remove('item-removing');
      button.style.display = 'block';
    });
  };
  
  // 핵심 기능: + 버튼 실시간 상태 업데이트
  async function updatePlusButtonStates(cartItems) {
    if (!cartItems || !Array.isArray(cartItems)) return;
    
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const plusButton = document.querySelector(`[data-item-index="${i + 1}"].cart-popup-item-quantity-plus`);
      const quantityElement = document.querySelector(`[data-item-index="${i + 1}"]`).parentElement.querySelector('.cart-popup-item-quantity');
      
      if (!plusButton || !item.variant_id || !quantityElement) continue;
      
      const currentQuantity = parseInt(quantityElement.textContent);
      
      try {
        // variant 재고 정보 확인
        const response = await fetch(`/variants/${item.variant_id}.js`);
        const variant = await response.json();
        
        let canIncrease = true;
        let maxQuantity = null;
        let reasonDisabled = '';
        
        // 재고 관리 여부 확인
        if (variant.inventory_management === 'shopify' && variant.inventory_policy === 'deny') {
          const availableInventory = variant.inventory_quantity;
          
          if (typeof availableInventory === 'number') {
            maxQuantity = availableInventory;
            canIncrease = currentQuantity < availableInventory;
            reasonDisabled = `최대 구매 가능: ${availableInventory}개`;
          } else if (availableInventory === false || availableInventory === 0) {
            canIncrease = false;
            reasonDisabled = '재고 없음';
          }
        }
        
        // 버튼 상태 업데이트
        if (canIncrease) {
          // ✅ 구매 가능
          plusButton.disabled = false;
          plusButton.style.opacity = '1';
          plusButton.style.cursor = 'pointer';
          plusButton.style.backgroundColor = '';
          plusButton.title = '';
        } else {
          // ❌ 구매 불가
          plusButton.disabled = true;
          plusButton.style.opacity = '0.4';
          plusButton.style.cursor = 'not-allowed';
          plusButton.style.backgroundColor = '#f5f5f5';
          plusButton.title = reasonDisabled;
        }
        
        // 시각적 표시 추가
        updateQuantityDisplay(quantityElement, currentQuantity, maxQuantity);
        
      } catch (error) {
        console.error('재고 상태 확인 오류:', error);
        // 오류 시 기본 상태 유지
        plusButton.disabled = false;
        plusButton.style.opacity = '1';
        plusButton.style.cursor = 'pointer';
      }
    }
  }

  // 수량 표시 시각적 업데이트
  function updateQuantityDisplay(quantityElement, currentQuantity, maxQuantity) {
    if (maxQuantity !== null) {
      // 최대 수량 표시
      quantityElement.style.color = currentQuantity >= maxQuantity ? '#ff6b6b' : '#000';
      
      // 재고 정보 툴팁 추가
      const quantityContainer = quantityElement.parentElement;
      let stockInfo = quantityContainer.querySelector('.stock-info');
      
      if (!stockInfo) {
        stockInfo = document.createElement('div');
        stockInfo.className = 'stock-info';
        stockInfo.style.cssText = `
          font-size: 10px;
          color: #666;
          text-align: center;
          margin-top: 2px;
        `;
        quantityContainer.appendChild(stockInfo);
      }
      
      if (currentQuantity >= maxQuantity) {
        stockInfo.textContent = '최대 수량';
        stockInfo.style.color = '#ff6b6b';
      } else {
        stockInfo.textContent = `재고: ${maxQuantity}개`;
        stockInfo.style.color = '#666';
      }
    }
  }
  
  // 장바구니 팝업 내용 업데이트 함수 (실시간 재고 제어 추가)
  window.updateCartPopupContents = function(cart) {
    console.log('Updating cart popup with:', cart);
    
    // cart 객체 유효성 검사
    if (!cart || typeof cart !== 'object' || cart.status === 422) {
      console.error('Invalid cart object or error response:', cart);
      return;
    }
    
    // 헤더의 장바구니 카운트 업데이트
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
      if (element) {
        element.textContent = cart.item_count || 0;
      }
    });
    
    const cartPopup = document.getElementById('cart-popup');
    if (!cartPopup) {
      console.error('Cart popup element not found!');
      return;
    }
    
    const cartItems = cartPopup.querySelector('.cart-popup-items');
    const cartTotal = cartPopup.querySelector('.cart-popup-total');
    
    if (!cartItems || !cartTotal) {
      console.error('Cart popup items or total element not found!');
      return;
    }
    
    // 장바구니 아이템 렌더링
    let itemsHTML = '';
    
    if (cart.items && Array.isArray(cart.items) && cart.items.length > 0) {
      cart.items.forEach((item, index) => {
        const imageUrl = item.image 
          ? (typeof item.image === 'string' ? item.image : item.image.src || '')
          : '';
        
        const itemId = item.key || item.id || index + 1;
        
        // variant 옵션 텍스트 생성
        const variantText = formatVariantOptions(item);
        const variantHTML = variantText ? `<div class="cart-popup-item-variant">${variantText}</div>` : '';
        
        itemsHTML += `
          <div class="cart-popup-item" data-item-id="${itemId}" data-item-index="${index + 1}" data-variant-id="${item.variant_id}">
            <div class="cart-popup-item-image">
              <img src="${imageUrl.replace(/(\.[^.]*)$/, '_120x$1')}" alt="${item.product_title || item.title}" />
            </div>
            <div class="cart-popup-item-details">
              <div class="i-top">
                <div class="cart-popup-item-title">${item.product_title || item.title}</div>
                ${variantHTML}
                <div class="cart-popup-item-quantity-control">
                  <button class="cart-popup-item-quantity-minus" data-item-index="${index + 1}">-</button>
                  <span class="cart-popup-item-quantity">${item.quantity}</span>
                  <button class="cart-popup-item-quantity-plus" data-item-index="${index + 1}" data-variant-id="${item.variant_id}">+</button>
                </div>
              </div>
              <div class="cart-popup-item-price">${window.formatMoney(item.final_price || item.price)}</div>
            </div>
            <button class="cart-popup-item-remove" data-item-index="${index + 1}">remove</button>
            <div class="loading-spinner"></div>
          </div>
        `;
      });
    } else {
      itemsHTML = '<div class="cart-popup-empty">empty</div>';
    }
    
    cartItems.innerHTML = itemsHTML;
    
    // 합계 업데이트
    let totalPrice = 0;
    
    if (typeof cart.total_price === 'number') {
      totalPrice = cart.total_price;
    } else if (typeof cart.total_price === 'string') {
      totalPrice = parseInt(cart.total_price) || 0;
    } else if (typeof cart.total === 'number') {
      totalPrice = cart.total;
    } else if (cart.items && Array.isArray(cart.items)) {
      totalPrice = cart.items.reduce((sum, item) => {
        const itemPrice = item.final_line_price || item.line_price || (item.price * item.quantity) || 0;
        return sum + itemPrice;
      }, 0);
    }
    
    cartTotal.textContent = window.formatMoney(totalPrice);

        // checkout 버튼 활성화/비활성화 처리
    const checkoutButton = cartPopup.querySelector('.btn-checkout');
    if (checkoutButton) {
      if (!cart.items || cart.items.length === 0 || cart.item_count === 0) {
        checkoutButton.disabled = true;
        checkoutButton.style.opacity = '0.5';
        checkoutButton.style.cursor = 'not-allowed';
        checkoutButton.style.pointerEvents = 'none';
      } else {
        checkoutButton.disabled = false;
        checkoutButton.style.opacity = '1';
        checkoutButton.style.cursor = 'pointer';
        checkoutButton.style.pointerEvents = 'auto';
      }
    }
    
    // 이벤트 리스너 추가
    addCartItemEventListeners(cartItems);
    
    // 🎯 각 아이템의 + 버튼 상태를 실시간으로 업데이트
    updatePlusButtonStates(cart.items);
  };

  // 이벤트 리스너 추가 함수
  function addCartItemEventListeners(cartItems) {
    // 삭제 버튼
    const removeButtons = cartItems.querySelectorAll('.cart-popup-item-remove');
    removeButtons.forEach(button => {
      button.addEventListener('click', window.handleRemoveItem);
    });
    
    // 수량 감소 버튼
    const minusButtons = cartItems.querySelectorAll('.cart-popup-item-quantity-minus');
    minusButtons.forEach(button => {
      button.addEventListener('click', window.handleQuantityChange.bind(null, 'decrease'));
    });
    
    // 수량 증가 버튼
    const plusButtons = cartItems.querySelectorAll('.cart-popup-item-quantity-plus');
    plusButtons.forEach(button => {
      button.addEventListener('click', window.handleQuantityChange.bind(null, 'increase'));
    });
  }
  
  // 수량 변경 처리 함수 (재고 기반 제어)
  window.handleQuantityChange = function(action, event) {
    event.preventDefault();
    
    const button = event.currentTarget;
    const itemIndex = button.dataset.itemIndex;
    const itemContainer = button.closest('.cart-popup-item');
    
    if (!itemIndex || !itemContainer) return;
    
    // + 버튼이 비활성화된 경우 클릭 무시
    if (action === 'increase' && button.disabled) {
      const reason = button.title || '재고가 부족합니다.';
      alert(reason);
      return;
    }
    
    const quantityElement = itemContainer.querySelector('.cart-popup-item-quantity');
    let currentQuantity = parseInt(quantityElement.textContent);
    let newQuantity = currentQuantity;
    
    if (action === 'increase') {
      newQuantity = currentQuantity + 1;
    } else if (action === 'decrease') {
      newQuantity = currentQuantity - 1;
      
      if (newQuantity <= 0) {
        window.handleRemoveItem({
          preventDefault: () => {},
          currentTarget: itemContainer.querySelector('.cart-popup-item-remove')
        });
        return;
      }
    }
    
    // 서버 검증으로 수량 업데이트
    updateCartQuantity(itemIndex, newQuantity, itemContainer, button);
  };

  // 장바구니 수량 업데이트 함수 (서버 검증)
  function updateCartQuantity(itemIndex, newQuantity, itemContainer, button) {
    itemContainer.classList.add('item-updating');
    button.disabled = true;
    
    const originalQuantity = parseInt(itemContainer.querySelector('.cart-popup-item-quantity').textContent);
    
    const body = JSON.stringify({
      line: parseInt(itemIndex),
      quantity: newQuantity
    });
    
    fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body
    })
    .then(response => {
      if (response.ok) {
        return response.json().then(cart => {
          if (cart && cart.items && typeof cart.total_price !== 'undefined') {
            // 성공적으로 업데이트됨
            window.updateCartPopupContents(cart);
          } else {
            throw new Error('잘못된 응답 형식');
          }
        });
      } else {
        // 422 등 에러 응답 처리
        return response.json().then(errorData => {
          console.log('Server error:', errorData);
          
          // 재고 부족 메시지 표시
          alert(errorData.description || errorData.message || '재고가 부족합니다.');
          
          // 원래 수량으로 복원
          const quantityElement = itemContainer.querySelector('.cart-popup-item-quantity');
          quantityElement.textContent = originalQuantity;
          
          // 실제 장바구니 상태로 새로고침
          return fetch('/cart.js')
            .then(res => res.json())
            .then(realCart => {
              if (realCart && realCart.items) {
                window.updateCartPopupContents(realCart);
              }
            });
        });
      }
    })
    .catch(error => {
      console.error('장바구니 수량 변경 오류:', error);
      
      // 원래 수량으로 복원
      const quantityElement = itemContainer.querySelector('.cart-popup-item-quantity');
      quantityElement.textContent = originalQuantity;
      
      alert('수량 변경 중 오류가 발생했습니다.');
    })
    .finally(() => {
      // UI 상태 복원
      itemContainer.classList.remove('item-updating');
      button.disabled = false;
    });
  }
  
  // 장바구니 팝업 표시 함수 (전역 함수로 선언)
  window.showCartPopup = function() {
    const cartPopup = document.getElementById('cart-popup');
    if (cartPopup) {
      cartPopup.classList.add('active');
      
      // 닫기 버튼에 이벤트 리스너 추가
      const closeButton = cartPopup.querySelector('.cart-popup-close');
      if (closeButton) {
        // 이벤트 리스너 중복 등록 방지
        closeButton.onclick = function() {
          cartPopup.classList.remove('active');
        };
      }
      
      // 배경 클릭 시 팝업창 닫기 (이벤트 버블링 주의)
      cartPopup.onclick = function(e) {
        if (e.target === cartPopup) {
          cartPopup.classList.remove('active');
        }
      };
    } else {
      console.error('Cart popup element not found!');
    }
  };
  
  // 각 제품 폼에 이벤트 리스너 추가
  
  // 미니 장바구니 내용 업데이트 함수 (variant 정보 추가)
  function updateMiniCartContents(cart) {
    const miniCartItems = document.querySelector('.mini-cart-items');
    const miniCartFooter = document.querySelector('.mini-cart-footer');
    const miniCartTitle = document.querySelector('.mini-cart-title');
    
    if (miniCartTitle) {
      miniCartTitle.textContent = `장바구니 (${cart.item_count})`;
    }
    
    if (miniCartItems) {
      // 장바구니 아이템이 있는 경우
      if (cart.item_count > 0) {
        let itemsHTML = '';
        
        // 각 아이템에 대한 HTML 생성 (variant 정보 포함)
        cart.items.forEach(item => {
          // variant 옵션 텍스트 생성
          const variantText = formatVariantOptions(item);
          const variantHTML = variantText ? `<div class="mini-cart-item-variant" style="color: #666; font-size: 12px; margin-bottom: 4px;">${variantText}</div>` : '';
          
          itemsHTML += `
            <div class="mini-cart-item">
              <div class="mini-cart-item-image">
                <img src="${item.image ? item.image.replace(/(\.[^.]*)$/, '_120x$1') : ''}" alt="${item.product_title}" />
              </div>
              <div class="mini-cart-item-details">
                <div class="mini-cart-item-title">${item.product_title}</div>
                ${variantHTML}
                <div class="mini-cart-item-price">${window.formatMoney(item.final_price)}</div>
                <div class="mini-cart-item-quantity">수량: ${item.quantity}</div>
              </div>
            </div>
          `;
        });
        
        miniCartItems.innerHTML = itemsHTML;
        
        // 푸터 업데이트 (합계)
        if (miniCartFooter) {
          miniCartFooter.innerHTML = `
            <div class="mini-cart-subtotal">
              <span>합계:</span>
              <span>${window.formatMoney(cart.total_price)}</span>
            </div>
            <div class="mini-cart-buttons">
              <a href="/checkout" class="btn-checkout">결제하기</a>
              <a href="/cart" class="btn-view-cart">장바구니 보기</a>
            </div>
          `;
        }
      } else {
        // 장바구니가 비어있는 경우
        miniCartItems.innerHTML = '<div class="mini-cart-empty">장바구니가 비어 있습니다.</div>';
        if (miniCartFooter) {
          miniCartFooter.innerHTML = '';
        }
      }
    }
  }
  
  // 미니 장바구니 표시 함수
  function showMiniCart() {
    if (miniCart) {
      miniCart.classList.add('active');
    }
  }
});

// ProductForm 웹 컴포넌트
if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      // 기존 로직을 별도 함수로
      // onSubmitHandler 메소드를 이것으로 교체
      async onSubmitHandler(evt) {
  evt.preventDefault(); // 먼저 기본 제출을 막음
  
  console.log('🚀 Buy Button 클릭됨 - 재고 검증 시작');
  
  const formData = new FormData(this.form);
  const resolveCurrentVariantId = () => {
    const formVariantId = formData.get('id');
    if (formVariantId) return String(formVariantId);

    const selectedVariantJson = this.closest('product-info')
      ?.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
    if (selectedVariantJson) {
      try {
        const selectedVariant = JSON.parse(selectedVariantJson);
        if (selectedVariant?.id) return String(selectedVariant.id);
      } catch (e) {
        console.warn('선택 variant 파싱 실패:', e);
      }
    }

    const urlVariantId = new URLSearchParams(window.location.search).get('variant');
    return urlVariantId ? String(urlVariantId) : '';
  };

  const variantId = resolveCurrentVariantId();
  if (!variantId) {
    alert('옵션을 다시 선택해 주세요.');
    return;
  }

  // hidden input / FormData 양쪽을 현재 선택 variant로 동기화
  this.variantIdInput.value = variantId;
  formData.set('id', variantId);
  const requestedQuantity = parseInt(formData.get('quantity')) || 1;
  
  try {
    // 1. 현재 장바구니 확인
    const cartResponse = await fetch('/cart.js');
    const currentCart = await cartResponse.json();
    
    let currentQuantityInCart = 0;
    if (currentCart.items) {
      const existingItem = currentCart.items.find(item => item.variant_id == variantId);
      if (existingItem) {
        currentQuantityInCart = existingItem.quantity;
      }
    }
    
    console.log('📦 현재 장바구니 수량:', currentQuantityInCart);
    
    // 2. variant 재고 정보 확인
    const variantResponse = await fetch(`/variants/${variantId}.js`);
    const variant = await variantResponse.json();
    
    console.log('📋 variant 정보:', variant);
    
    // 3. 🎯 재고 제한 검사 (서버 요청 전에 차단)
    if (variant.inventory_management === 'shopify' && variant.inventory_policy === 'deny') {
      const availableInventory = variant.inventory_quantity;
      const totalRequestedQuantity = currentQuantityInCart + requestedQuantity;
      
      console.log('🔍 재고 검사:', {
        availableInventory,
        currentQuantityInCart,
        requestedQuantity,
        totalRequestedQuantity
      });
      
      if (typeof availableInventory === 'number') {
        if (totalRequestedQuantity > availableInventory) {
          // ❌ 재고 부족 - 서버 요청하지 않고 바로 차단
          let errorMessage = '';
          
          if (availableInventory === 0) {
            errorMessage = '죄송합니다. 이 상품은 현재 품절되었습니다.';
          } else if (currentQuantityInCart >= availableInventory) {
            errorMessage = `이미 최대 구매 가능 수량(${availableInventory}개)을 장바구니에 담으셨습니다.`;
          } else {
            const remainingQuantity = availableInventory - currentQuantityInCart;
            errorMessage = `재고가 부족합니다. 최대 ${remainingQuantity}개까지만 추가로 구매 가능합니다.\n(현재 장바구니: ${currentQuantityInCart}개, 재고: ${availableInventory}개)`;
          }
          
          alert(errorMessage);
          console.log('❌ 재고 부족으로 차단됨 - 서버 요청 안함');
          return; // 여기서 완전히 중단 - 서버에 요청하지 않음
        }
      }
    }
    
    console.log('✅ 재고 충분 - 서버 요청 진행');
    
  } catch (error) {
    console.error('재고 확인 중 오류:', error);
    console.log('재고 확인 실패 - 서버 검증으로 진행');
  }
  
  // 4. 🎯 재고가 충분한 경우 기존 서버 요청 로직 실행
  this.submitButton.setAttribute('aria-disabled', true);
  this.submitButton.classList.add('loading');
  this.querySelector('.loading__spinner').classList.remove('hidden');

  const config = fetchConfig('javascript');
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  delete config.headers['Content-Type'];

  if (this.cart) {
    formData.append(
      'sections',
      this.cart.getSectionsToRender().map((section) => section.id)
    );
    formData.append('sections_url', window.location.pathname);
    this.cart.setActiveElement(document.activeElement);
  }
  config.body = formData;

  fetch(`${routes.cart_add_url}`, config)
    .then((response) => response.json())
    .then((response) => {
      if (response.status) {
        publish(PUB_SUB_EVENTS.cartError, {
          source: 'product-form',
          productVariantId: formData.get('id'),
          errors: response.errors || response.description,
          message: response.message,
        });
        
        // 에러 메시지 표시
        const errorWrapper = this.querySelector('.product-form__error-message-wrapper');
        const errorMessage = this.querySelector('.product-form__error-message');
        if (errorWrapper && errorMessage) {
          errorWrapper.hidden = false;
          errorMessage.textContent = response.description;
        }

        const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
        if (!soldOutMessage) return;
        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButtonText.classList.add('hidden');
        soldOutMessage.classList.remove('hidden');
        this.error = true;
        return;
      }
      
      // 장바구니 팝업 표시
      const cartPopup = document.getElementById('cart-popup');
      if (cartPopup && window.updateCartPopupContents && window.showCartPopup) {
        // 전체 장바구니 정보 가져오기
        fetch('/cart.js')
          .then(res => res.json())
          .then(cart => {
            window.updateCartPopupContents(cart);
            window.showCartPopup();
            
            // 버튼 상태 복원
            this.submitButton.classList.remove('loading');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
          })
          .catch(err => console.error('장바구니 정보 가져오기 오류:', err));
        
        return;
      } else if (!this.cart) {
        window.location = window.routes.cart_url;
        return;
      }

      // 기존 카트 기능 (팝업이 없는 경우)
      const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
      if (!this.error)
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'product-form',
          productVariantId: formData.get('id'),
          cartData: response,
        }).then(() => {
          CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
        });
      this.error = false;
      const quickAddModal = this.closest('quick-add-modal');
      if (quickAddModal) {
        document.body.addEventListener(
          'modalClosed',
          () => {
            setTimeout(() => {
              CartPerformance.measureFromMarker("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            });
          },
          { once: true }
        );
        quickAddModal.hide(true);
      } else {
        CartPerformance.measureFromMarker("add:paint-updated-sections", () => {
          this.cart.renderContents(response);
        });
      }
    })
    .catch((e) => {
      console.error('장바구니 추가 처리 오류:', e);
    })
    .finally(() => {
      this.submitButton.classList.remove('loading');
      if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
      if (!this.error) this.submitButton.removeAttribute('aria-disabled');
      this.querySelector('.loading__spinner').classList.add('hidden');

      CartPerformance.measureFromEvent("add:user-action", evt);
    });
}

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}