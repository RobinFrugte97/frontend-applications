<script>
	export let data;
	console.log("home");
	import Object from '../components/Object.svelte'

</script>
<style>
	div {
		background: url("/images/indonesia.svg") no-repeat;
		background-size: 100%;
		height: 55em;
	}
	ul {
		display: flex;
	}
	
</style>
<div>
<h1>Architectuur van Indonesië</h1>
<ul>
	{#each data as source}
	<Object link="details/{source.cho.value.slice(-6)}" 
			imageSource={source.imageModel.value} 
			objectTitle={source.modelName.value}/>
	<!-- <li><a href="details/{source.cho.value.slice(-6)}">
		<img src={source.imageModel.value} alt={source.modelName.value}>
		<h2>{source.modelName.value}</h2>
	</a></li> -->
	{/each}
</ul>
</div>