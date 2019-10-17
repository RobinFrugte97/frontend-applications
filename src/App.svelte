<script>
	export let name;

	const el = document.querySelector('img')
	const url ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql"
	//Note that the query is wrapped in es6 template strings to allow for easy copy pasting
	const query = `
	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
	PREFIX dc: <http://purl.org/dc/elements/1.1/>
	PREFIX dct: <http://purl.org/dc/terms/>
	PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
	PREFIX edm: <http://www.europeana.eu/schemas/edm/>
	PREFIX foaf: <http://xmlns.com/foaf/0.1/>

	SELECT DISTINCT ?cho ?modelNaam ?placeName ?imageModel WHERE {
	   <https://hdl.handle.net/20.500.11840/termmaster7745> skos:narrower* ?place .
	   ?place skos:prefLabel ?placeName .
	   VALUES ?type {"huismodel" "Huismodel"} .
	   ?cho dc:title ?modelNaam ;
	        dc:type ?type ;
	        dct:spatial ?place ;
	        edm:isShownBy ?imageModel .
	} ORDER BY ?cho LIMIT 25
	`
	runQuery(url, query)
	let data = {};
	function runQuery(url, query){

	  //Test if the endpoint is up and print result to page
	  // (you can improve this script by making the next part of this function wait for a succesful result)
	  fetch(url+"?query="+ encodeURIComponent(query) +"&format=json")
	  .then(res => res.json())
	  .then(json => {

		  data = json.results.bindings
		  console.log(data);
	  })

	}
</script>

<style>
	h1 {
		color: purple;
	}
	img {
		width: 5rem;
	}
	ul {
		display: flex;
		flex-direction: column;
	}
</style>

<h1>Hello {name}!</h1>
<ul>
	{#each data as source}
		<ul>

		</ul>
		<h2>{source.modelNaam.value}</h2>
		<img src={source.imageModel.value} alt={source.modelNaam.value}>
	{/each}
</ul>
