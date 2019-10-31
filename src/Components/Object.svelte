<script>
    export let link;
    export let imageSource;
    export let objectTitle;
</script>
<style>
    li {
		position: absolute;
		width: 14rem;
		display: flex;
		flex-direction: column;
		height: 13em;
		background-color: #efefef;
		border-radius: 0px 5% 5% 5%;
		transition: .5s ease;
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