/*
Original: https://pomb.us/build-your-own-react/
*/

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
	const dom = element.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(element.type);

	const isProperty = key => key !== "children";
	Object.keys(element.props)
		.filter(isProperty)
		.forEach(name => {
			dom[name] = element.props[name];
		});

	element.props.children.forEach(child => render(child, dom));
	container.appendChild(dom);
};

export { createElement, render };