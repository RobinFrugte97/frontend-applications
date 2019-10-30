<script>
	export let data;
	console.log("home");

</script>
<style>
	img {
		width: 100%;
	}
	div {
		background: url("/images/indonesia.svg") no-repeat;
		background-size: 100%;
		height: 55em;
	}
	li {
		width: 25%;
		display: flex;
		flex-direction: column;
		height: 20em;
		background-color: red;
	}
	ul {
		display: flex;
	}
	h2 {
		font-size: 1rem;
	}
	a {
		text-decoration: none;
		color: black;
	}
</style>
<div>
<h1>Architectuur van Indonesië</h1>
<ul>
	{#each data as source}
	<li><a href="details/{source.cho.value.slice(-6)}">
		<h2>{source.modelNaam.value}</h2>
		<img src={source.imageModel.value} alt={source.modelNaam.value}>
	</a></li>
	{/each}
</ul>
</div>