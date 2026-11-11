export function swipeDirection(start, end) {
	const horizontal = end.x - start.x;
	const vertical = end.y - start.y;
	if (Math.abs(horizontal) < 50 || Math.abs(horizontal) < Math.abs(vertical) * 1.5) {
		return null;
	}
	return horizontal < 0 ? -1 : 1;
}

export function findAvailableCard(cards, currentIndex, direction) {
	for (let index = currentIndex + direction; index >= 0 && index < cards.length; index += direction) {
		if (!cards[index]?.revealed && !cards[index]?.hidden) return index;
	}
	return -1;
}
