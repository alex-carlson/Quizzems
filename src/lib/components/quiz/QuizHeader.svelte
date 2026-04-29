<script>
	export let collectionName,
		author,
		authorSlug = '',
		thumbnail,
		description = '';
</script>

<div class="headline my-3">
	{#if thumbnail}
		<div class="thumbnail mb-3">
			<img src={thumbnail} alt={collectionName} class="img-fluid" />
		</div>
	{/if}
	<div class="details">
		<h1 class="h3">{collectionName}</h1>
		<p class="mb-2">by <a href={`/author/${authorSlug}`}>{author}</a></p>
	</div>
	{#if description}
		<div class="description">
			<p class="mb-0">
				{description}
			</p>
		</div>
	{/if}
</div>
