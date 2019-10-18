import Query from './Components/mainPage.svelte';

const app = new Query({
	target: document.body,
	props: {
		name: 'World'
	}
});

export default app;
