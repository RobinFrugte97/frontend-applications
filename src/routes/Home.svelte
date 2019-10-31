<script>
	export let data;
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
	{/each}
</ul>
</div>