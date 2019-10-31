<script>	
	export let data
	
	import Related from '../components/Related.svelte';
	const queryUrl ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql"
	let detailURI = window.location.pathname.slice(-6); //slice the unique part from the URL to use for a second query to fetch detail page data.
	let detailQuery = ``;
	let detailData = [];
	
	function formulateQuery(detailURI) {
		detailQuery = `
		PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
		PREFIX dc: <http://purl.org/dc/elements/1.1/>
		PREFIX dct: <http://purl.org/dc/terms/>
		PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
		PREFIX edm: <http://www.europeana.eu/schemas/edm/>
		PREFIX foaf: <http://xmlns.com/foaf/0.1/>
		SELECT ?cho ?modelName ?placeName ?imageModel ?date ?modelMaterial ?modelRelated ?description WHERE {
			<https://hdl.handle.net/20.500.11840/` + detailURI + `> dc:title ?modelName ;
		   		dct:medium ?material ;
		   		dct:created ?date ;
				dc:type ?type ;
				dct:spatial ?place ;
				edm:isRelatedTo ?related ;
				edm:isShownBy ?imageModel .
				?material skos:prefLabel ?modelMaterial . 
				?place skos:prefLabel ?placeName .
				?related skos:prefLabel ?modelRelated .
		} LIMIT 1
		`
	}
	async function runDetailQuery(queryUrl, detailQuery){

		await fetch(queryUrl+"?query="+ encodeURIComponent(detailQuery) +"&format=json")
		.then(res => res.json())
		.then(json => {
			detailData = json.results.bindings
			console.log(detailData[0]);
		})
	}
	formulateQuery(detailURI); //put the unique part of the URI of the selected object in a SPARQL query.
	runDetailQuery(queryUrl, detailQuery); //use the new query to fetch the data for the detail page
			
</script>
<style>
	* {
		transition: .5s ease;
	}
	#gradient {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		background: linear-gradient(to left, transparent 0%, #efefef 31% );
		padding: 0;
	}
	div {
		padding: 2rem;
	}
	main {
		position: absolute;
		background-color: #efefef;
		width: 66%;
		left: 0;
		top: 0;
		padding: 1rem;
		padding-left: 3rem;
	}
	img {
		width: 40rem;
	}
	section {
		display: flex;
	}
</style>
{#if detailData.length == 1}
<div id="gradient">
</div>
<main>
	<h1>{detailData[0].modelName.value}</h1>
	<section>
		<img src={detailData[0].imageModel.value} alt="{detailData[0].modelName.value}">
		<div>
			<p>{detailData[0].date.value}</p>
			<p>Model van een Minangkabau woning met uitbreiding. In een Minangkabau familiewoning wonen meerdere gezinnen, alle afstammelingen van dezelfde grootmoeder. Het huis is verdeeld in evenveel afdelingen (ruangs) als er gezinnen wonen. Wordt een Minangkabau huis te klein dan kunnen aan weerszijden stukken worden bijgebouwd, waarvan het dak evenals dat van het oorspronkelijke gedeelte in spits toelopende punten (tanduk) eindigt. Het onderhavige model heeft vier punten. Er bestaan woningen van twee, vier, zes of acht punten.</p>
		</div>
	</section>
</main>
<Related data={data}/>
{/if}