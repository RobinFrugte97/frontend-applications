<script>
	export let data;
	export let queryUrl;
	export let instances;
	console.log("home");

</script>
<style>
	img {
		width: 25%;
	}
</style>
<h1>Architectuur van Indonesië</h1>
<ul>
	{#each data as source}
	<a href="details/{source.cho.value.slice(-6)}"><li>
		<h2>{source.modelNaam.value}</h2>
		<img src={source.imageModel.value} alt={source.modelNaam.value}>
	</li></a>
	{/each}
</ul>
