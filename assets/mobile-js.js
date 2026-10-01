document.addEventListener('DOMContentLoaded', function() {
    const navMenuBtn = document.querySelector('.menu-open')
    const navMenu = document.querySelector('#shopify-section-custom-menu')
    const headerBagTxt = document.querySelectorAll('.header-cart a p, .cart-count, .menu-open, .header__heading-logo.custom-svg-logo')
    const logoImg = document.getElementById('header-logo') // 로고 이미지 요소 찾기
    
    // 현재 페이지가 인덱스 페이지인지 확인 (URL로 체크)
    const isIndexPage = window.location.pathname === '/' || window.location.pathname === '/index' || window.location.pathname === '/index.html';
    
    if (navMenu && navMenuBtn) {
      navMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active')
        if(navMenuBtn.innerHTML === 'menu') {
          navMenuBtn.innerHTML = 'close'
          
          // 메뉴 열릴 때 로고를 흰색 로고로 변경
          if(logoImg) {
            // 절대 경로 또는 상대 경로로 로고 파일 지정
            logoImg.src = "/cdn/shop/t/3/assets/moseori_logo_w.svg" // 경로를 실제 경로로 수정해주세요
          }
          
          headerBagTxt.forEach(el => {
            el.style.color = "white"
          })
        } else {
           navMenuBtn.innerHTML = 'menu'
          
           // 메뉴 닫힐 때 현재 페이지가 인덱스가 아니면 기본 로고로 변경
           if(logoImg && !isIndexPage) {
             logoImg.src = "/cdn/shop/t/3/assets/moseori_logo.svg" // 경로를 실제 경로로 수정해주세요
           }
          
            headerBagTxt.forEach(el => {
              el.style.color = ""
            })
        }
      })
    }
});