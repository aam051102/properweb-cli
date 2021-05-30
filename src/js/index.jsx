document.body.querySelector("button").addEventListener("click", e => {
	e.preventDefault();

	const component = (
		<li className="test-li">
			<p>A new component.</p>
		</li>
	);

	render(component, document.body.querySelector("ul"));
});