if (!customElements.get('card-media-nav')) {
  customElements.define(
    'card-media-nav',
    class CardMediaNav extends HTMLElement {
      connectedCallback() {
        const data = this.querySelector('script[type="application/json"]');
        this.images = data ? JSON.parse(data.textContent) : [];
        this.index = 0;
        const root = this.closest('.card-wrapper') || this.parentElement;
        this.image = root?.querySelector('.card-media-nav__image');

        if (!this.image || this.images.length < 2) return;

        this.querySelectorAll('button').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const direction = button.dataset.direction === 'next' ? 1 : -1;
            this.show(this.index + direction);
          });
        });

        this.closest('.card-wrapper')?.addEventListener('mouseenter', () => this.preload(), { once: true });
      }

      preload() {
        this.images.forEach((image) => {
          const preload = new Image();
          preload.src = image.src;
        });
      }

      show(index) {
        const count = this.images.length;
        this.index = (index + count) % count;
        const image = this.images[this.index];
        this.image.removeAttribute('srcset');
        this.image.src = image.src;
        this.image.alt = image.alt || '';
      }
    }
  );
}
