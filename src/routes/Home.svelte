<script>
	export let data;
	console.log("home");

</script>
<style>
	img {
		width: 81%;
    	height: 7rem;
    	margin-top: 2rem;		
	}
	div {
		background: url("/images/indonesia.svg") no-repeat;
		background-size: 100%;
		height: 55em;
	}
	li {
		position: absolute;
		width: 14rem;
		display: flex;
		flex-direction: column;
		height: 13em;
		background-color: #efefef;
		border-radius: 0px 5% 5% 5%;
		transition-timing-function: ease;
	}
	li:hover {
		transform: scale(1.05);

	}
	li:nth-of-type(1){
		top: 68%;
		left: 27%;
	}
	li:nth-of-type(2){
		top: 42%;
    	left: 82%;
	}
	li:nth-of-type(3){
		top: 30%;
		left: 47%;
	}
	li:nth-of-type(4){
		top: 39%;
    	left: 16%;
	}
	li:nth-of-type(5){
		top: 72%;
    	left: 68%;
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
		text-align: center;
	}
</style>
<div>
<h1>Architectuur van Indonesië</h1>
<ul>
	{#each data as source}
	<li><a href="details/{source.cho.value.slice(-6)}">
		<img src={source.imageModel.value} alt={source.modelName.value}>
		<h2>{source.modelName.value}</h2>
	</a></li>
	{/each}
</ul>
</div>