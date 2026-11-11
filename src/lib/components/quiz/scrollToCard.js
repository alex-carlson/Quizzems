export function scrollToCard(index, behavior = 'smooth') {
	const card = document.querySelector(`[data-card-index="${index}"]`);
	if (!card) return;

	const fullscreen = document.fullscreenElement;
	const bar = fullscreen
		? fullscreen.querySelector('.toolbar')
		: document.querySelector('.quiz-status-bar');
	let offset = 0;
	if (bar) {
		const style = getComputedStyle(bar);
		if (style.position === 'sticky') {
			offset = (parseFloat(style.top) || 0) + bar.getBoundingClientRect().height;
		} else if (style.position === 'fixed') {
			offset = Math.max(0, bar.getBoundingClientRect().bottom);
		}
	}

	card.style.scrollMarginTop = `${offset}px`;
	card.scrollIntoView({ behavior, block: 'start' });
}
