if (!customElements.get('infinite-scroll')) {
  customElements.define(
    'infinite-scroll',
    class InfiniteScroll extends HTMLElement {
      connectedCallback() {
        this.isLoading = false;
        this.link = this.querySelector('.infinite-scroll__link');
        this.spinner = this.querySelector('.infinite-scroll__spinner');
        this.section = this.closest('.shopify-section') || document;
        this.sectionId = this.section.id?.replace('shopify-section-', '');

        if (!this.dataset.nextUrl) return;

        this.link?.setAttribute('hidden', '');
        this.observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) this.loadNextPage();
          },
          { rootMargin: '0px 0px 600px 0px' }
        );
        this.observer.observe(this);
      }

      disconnectedCallback() {
        this.observer?.disconnect();
      }

      async loadNextPage() {
        const container = this.section.querySelector(this.dataset.container);
        if (this.isLoading || !this.dataset.nextUrl || !container) return;

        this.toggleLoading(true);

        try {
          const url = new URL(this.dataset.nextUrl, window.location.origin);
          if (this.sectionId) url.searchParams.set('section_id', this.sectionId);

          const response = await fetch(url.toString());
          if (!response.ok) throw new Error(`Infinite scroll request failed: ${response.status}`);

          const html = new DOMParser().parseFromString(await response.text(), 'text/html');
          const newContainer = html.querySelector(this.dataset.container);
          const nextTrigger = Array.from(html.querySelectorAll('infinite-scroll')).find(
            (element) => element.dataset.container === this.dataset.container
          );

          if (newContainer) {
            const newItems = Array.from(newContainer.children).filter(
              (element) => !['INFINITE-SCROLL', 'SCRIPT', 'LINK', 'STYLE'].includes(element.tagName)
            );
            const anchor = this.parentElement === container ? this : null;
            newItems.forEach((item) => container.insertBefore(item, anchor));
            this.revealItems(newItems);
          }

          const nextUrl = nextTrigger?.dataset.nextUrl;
          if (!nextUrl) {
            this.remove();
            return;
          }

          this.setNextUrl(nextUrl);
          this.toggleLoading(false);
          this.observer.unobserve(this);
          this.observer.observe(this);
        } catch (error) {
          console.error(error);
          this.toggleLoading(false);
          this.observer.disconnect();
          this.link?.removeAttribute('hidden');
        }
      }

      setNextUrl(nextUrl) {
        const url = new URL(nextUrl, window.location.origin);
        url.searchParams.delete('section_id');
        this.dataset.nextUrl = `${url.pathname}${url.search}`;
        if (this.link) this.link.href = this.dataset.nextUrl;
      }

      toggleLoading(isLoading) {
        this.isLoading = isLoading;
        this.spinner?.classList.toggle('hidden', !isLoading);
      }

      revealItems(items) {
        const triggers = items.flatMap((item) => [
          ...(item.classList.contains('scroll-trigger') ? [item] : []),
          ...item.getElementsByClassName('scroll-trigger'),
        ]);
        if (triggers.length === 0) return;

        if (typeof onIntersection !== 'function') {
          triggers.forEach((element) => element.classList.add('scroll-trigger--cancel'));
          return;
        }

        const observer = new IntersectionObserver(onIntersection, { rootMargin: '0px 0px -50px 0px' });
        triggers.forEach((element) => observer.observe(element));
      }
    }
  );
}
