<script>
	export let data;
</script>
<style>
	img {
		width: 25%;
	}
</style>
<h1>Architectuur van Indonesië</h1>
<ul>
	{#each data as source}
	<a href=/{source.cho.value}><li>
		<h2>{source.modelNaam.value}</h2>
		<img src={source.imageModel.value} alt={source.modelNaam.value}>
	</li></a>
	{/each}
</ul>
