<script>
	import { Router, Route } from "svelte-routing";
	export let url = "";
	import NavLink from "./components/NavLink.svelte";
	import Home from "./routes/Home.svelte";
	import About from "./routes/About.svelte";
	import Blog from "./routes/Blog.svelte";
  	import { onMount } from "svelte";



  // Used for SSR. A falsy value is ignored by the Router.

	const queryUrl ="https://api.data.netwerkdigitaalerfgoed.nl/datasets/ivo/NMVW/services/NMVW-08/sparql"
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

	let data = {};
	function runQuery(queryUrl, query){
	  //Test if the endpoint is up and print result to page
	  // (you can improve this script by making the next part of this function wait for a succesful result)
	  fetch(queryUrl+"?query="+ encodeURIComponent(query) +"&format=json")
	  .then(res => res.json())
	  .then(json => {
		  data = json.results.bindings
		  console.log(data);
	  })
	}
	onMount(() => {
		runQuery(queryUrl, query);
	});
</script>

<Router url="{url}">
  <nav>
    <NavLink to="/">Home</NavLink>
    <NavLink to="about">About</NavLink>
    <NavLink to="blog">Blog</NavLink>
  </nav>
  <div>
    <Route path="about" component="{About}" />
    <Route path="blog/*" component="{Blog}" />
    <Route path="/" component="{Home}" data={data} />
	<!-- <Route path=/{data.cho.value} /> -->
  </div>
</Router>
