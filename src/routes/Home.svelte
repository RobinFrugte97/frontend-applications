<script>
	export let data;
	import Object from '../components/Object.svelte';
</script>
<style>
	ul {
		display: flex;
	}
</style>
<div>
<h1>Architectuur van Indonesië</h1>
<ul>
	{#each data as source}
	<Object data={data}
			link="details/{source.cho.value.slice(-6)}" 
			imageSource={source.imageModel.value} 
			objectTitle={source.modelName.value}/>
	{/each}
</ul>
</div>