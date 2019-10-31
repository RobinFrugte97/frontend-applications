<script>
    import RelatedObject from '../components/RelatedObject.svelte';
    export let data;
    console.log(data);
</script>
<style>
    nav {
        top: 41rem;
        width: 61rem;
        height: 16rem;
        display: flex;
        position: absolute;
        overflow-x: scroll;
        margin-left: 2.5rem;
    }
</style>
<nav>
    {#each data as data}
        <RelatedObject link="details/{data.cho.value.slice(-6)}" 
                imageSource={data.imageModel.value} 
                objectTitle={data.modelName.value}/>
    {/each}
</nav>
