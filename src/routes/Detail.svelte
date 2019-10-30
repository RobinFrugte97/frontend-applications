<script>

	const queryUrl ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql"
	let detailURI = window.location.pathname.slice(-6);
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
		SELECT ?cho ?modelName ?placeName ?imageModel WHERE {
		   <https://hdl.handle.net/20.500.11840/` + detailURI + `> dc:title ?modelName ;
		        dc:type ?type ;
		        dct:spatial ?place ;
		        edm:isShownBy ?imageModel .
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
	formulateQuery(detailURI);
	runDetailQuery(queryUrl, detailQuery)
			
</script>
{#if detailData.length == 1}
	<h1>{detailData[0].modelName.value}</h1>
	<img src={detailData[0].imageModel.value} alt="">
{/if}