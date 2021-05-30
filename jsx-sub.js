/*
Original: https://pomb.us/build-your-own-react/
*/

let docLocale;

if (typeof document !== "undefined") {
	docLocale = document;
} else if (typeof doc !== "undefined" && typeof doc.document !== "undefined") {
	docLocale = doc.document;
} else {
	throw new Error("Something is seriously wrong");
}

const createElement = (type, props, ...children) => ({
	type,
	props: {
		...props,
		children: children.map(child =>
			typeof child === "object" ? child : createTextElement(child))
	}
});

const createTextElement = text => ({
	type: "TEXT_ELEMENT",
	props: {
		nodeValue: text,
		children: []
	}
});

const render = (element, container) => {
	let dom;
	switch (element.type) {
		case "TEXT_ELEMENT":
			dom = docLocale.createTextNode("");
			break;

		case "JSX_FRAG":
			element.props.children.forEach(child => render(child, container));
			return;

		default:
			dom = docLocale.createElement(element.type);
			break;
	}

	// Non-frag elements
	const isProperty = key => key !== "children";
	Object.keys(element.props)
		.filter(isProperty)
		.forEach(name => {
			dom[name] = element.props[name];
		});

	element.props.children.forEach(child => render(child, dom));
	container.appendChild(dom);
};

const renderToString = (element, container) => {
	let dom;
	switch (element.type) {
		case "TEXT_ELEMENT":
			dom = docLocale.createTextNode("");
			break;

		case "JSX_FRAG":
			element.props.children.forEach(child => renderToString(child, dom));
			return;

		default:
			dom = docLocale.createElement(element.type);
			break;
	}

	// Non-frag elements
	const isProperty = key => key !== "children";
	Object.keys(element.props)
		.filter(isProperty)
		.forEach(name => {
			dom[name] = element.props[name];
		});

	element.props.children.forEach(child => renderToString(child, dom));

	if (container === undefined) {
		return dom.outerHTML;
	}

	container.appendChild(dom);
};

export { createElement, render, renderToString };