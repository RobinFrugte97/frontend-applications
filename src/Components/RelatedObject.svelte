<script>
    export let link;
    export let imageSource;
    export let objectTitle;
</script>
<style>
    li {
		position: relative;
		min-width: 14rem;
		display: flex;
		flex-direction: column;
		height: 13em;
		background-color: #efefef;
		border-radius: 0px 5% 5% 5%;
		transition: .5s ease;
	}
    img {
		width: 81%;
    	height: 7rem;
    	margin-top: 2rem;		
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
<li><a href={link}>
	<img src={imageSource} alt={objectTitle}>
	<h2>{objectTitle}</h2>
</a></li>