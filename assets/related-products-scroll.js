/**
 * 관련 상품 리스트 - grab 드래그 가로 스크롤
 * .related-products__list--scroll 에 적용 (product-recommendations 비동기 로드 대응)

 */
(function () {
  const DRAG_THRESHOLD_PX = 10;

  function initGrabScroll(container) {
    if (container.dataset.grabScrollInited) return;
    container.dataset.grabScrollInited = 'true';

    let isDown = false;
    let pointerDownPageX = 0;
    let dragCommitted = false;
    let dragRefScrollLeft = 0;
    let dragRefPageX = 0;

    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDown = true;
      dragCommitted = false;
      pointerDownPageX = e.pageX;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.classList.remove('is-dragging');
      dragCommitted = false;
    });

    container.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      isDown = false;
      container.classList.remove('is-dragging');
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;

      const moved = Math.abs(e.pageX - pointerDownPageX);
      if (moved <= DRAG_THRESHOLD_PX && !dragCommitted) return;

      if (!dragCommitted) {
        dragCommitted = true;
        container.classList.add('is-dragging');
        dragRefScrollLeft = container.scrollLeft;
        dragRefPageX = e.pageX;
      }

      e.preventDefault();
      const delta = e.pageX - dragRefPageX;
      container.scrollLeft = dragRefScrollLeft - delta * 1.2;
    });

    container.addEventListener(
      'click',
      (e) => {
        if (e.target.closest('a') && dragCommitted) {
          e.preventDefault();
        }
        dragCommitted = false;
      },
      true
    );
  }

  function initScrollLists() {
    document.querySelectorAll('.related-products__list--scroll').forEach(initGrabScroll);
  }

  const observer = new MutationObserver(() => {
    initScrollLists();
  });

  document.querySelectorAll('product-recommendations').forEach((el) => {
    observer.observe(el, { childList: true, subtree: true });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollLists);
  } else {
    initScrollLists();
  }
})();
