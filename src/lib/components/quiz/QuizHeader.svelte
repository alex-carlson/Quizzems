<script>
	export let collectionName,
		author,
		authorSlug = '',
		thumbnail,
		thumbnails = [],
		authors = [],
		description = '';
</script>

<div class="headline my-3">
	{#if thumbnails?.length}
		<div class="thumbnails mb-3 d-flex flex-wrap gap-2 align-items-start justify-content-center">
			{#each thumbnails as src}
				<img {src} alt={collectionName} class="img-fluid" style="max-width: 150px; height: auto; object-fit: contain;" />
			{/each}
		</div>
	{:else if thumbnail}
		<div class="thumbnail mb-3">
			<img src={thumbnail} alt={collectionName} class="img-fluid" />
		</div>
	{/if}
	<div class="details">
		<h1 class="h3">{collectionName}</h1>
		{#if authors?.length}
			<p class="mb-2">
				by
				{#each authors as a, i}<a href={`/author/${a.slug}`}>{a.name}</a>{i < authors.length - 1 ? ', ' : ''}{/each}
			</p>
		{:else}
			<p class="mb-2">by <a href={`/author/${authorSlug}`}>{author}</a></p>
		{/if}
	</div>
	{#if description}
		<div class="description">
			<p class="mb-0">
				{description}
			</p>
		</div>
	{/if}
</div>
