# LINCS Browser Plugin (formerly Infobox) - Version 2.0

This project contains the components to create a LINCS Knowledge Panel that is similar to the knowledge panel on the right of the page when you do a Google search.

The browser extension is called the LINCS Entity Search Tool.

## Running the Test Extension

- Pull the repo into a local folder on your computer
- Open a chromium based browser and navigate to the extensions page through the menu (or by navitating to `chrome://extensions` or `edge://extensions` for Chrome and Edge respectively)
- Turn on developer mode (top-right corner for Chrome, bottom-left for Edge)
- Select the Load Unpacked button and provide the folder's filepath so that the root of the selected folder contains `manifest.json`
- The extension will load and be enabled
- Pin the extension in your browser bar. Click on the LINCS icon to activate the plugin on the current page.

## Running the test site

Used for local developement

```bash
cd test-site
python3 -m http.server 8000
```

## Functional requirements

The LINCS panel should be an installable browser plugin that provides a button in the browser's toolbar to enable/disable the plugin.

- Enabling the plugin will show a floating information panel on the top right of the page.
- The page contents should be POS tagged, after which all nouns should be checked if they exist in the LINCS knowledge graph.
- The found nouns should be highlighted in the text on the web page.
- When user mouses over an entity, a mini popup should be shown with the most relevant classifying information a la wikipedia.
- When a user clicks the label on the popup, the knowledge panel should be populated.
- The knowledge panel should contain the following:
  - rdfs label with a link to the ResearchSpace entity
  - an image if one is available in ResearchSpace
  - links to other LINCS tools e.g. Huviz/RPB
  - map, context, relationships
  - quick download function
- Upon first loading a page, the knowledge panel should be loaded with the most relevant/highest scoring entity by default, before a user clicks on one of the entities to override the panel.

## Technical specification

The plugin should be built for Webkit browsers (Chrome & Edge)
