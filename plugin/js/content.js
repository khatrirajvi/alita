const textBatchSize = 3000; // This is the size for batching text scans
const requestDelay = 10; // The amount of time in ms to wait before sending another text segment to scan
const sidebarURL = "https://plugin.lincsproject.ca/#/"; // The base url of the sidebar iframe
let numHighlights = 0; // The number of highlights currently displayed on screen
let highlightElements = []; // An array holding all highlight elements
let focussedHighlight = null; // This is the highlightcurrently focussed on
let totalRequests = 0; // A count of the total number of scan requests
let finishedRequests = 0; // A count of the total number of completed scan requests
let inFlightRequests = []; // This is a list of all highlight requests pending response
let sidebar = null; // This is the iframe element holding the sidebar
let sidebarSelections = null; // This is the selection sindow to minimize/maxmize the sidebar
let activeD3 = null; // This is the activly displayed D3 instance
let d3Data = {}; // This holds d3 objects that are in use
let graphDisplayed = false; // This boolean is set when a graph overlay is displayed
let currentTarget = null; // This holds the element the graph is currently targeting
let currentEntity = null; // This holds the entity info for the entity the graph is displaying
let entityList = []; // This is the current list of traversed entities
let bodyCopy = null; // A complete copy of the body element that gets placed on extension close
let loading = false; // A boolean for in progress scans
let highlightedWords = []; // This is a list of all words currently highlighted
let allNodes = []; // This is a list of all nodes that have been scanned on the page

/* Message listeners and dispatchers */
chrome.runtime.onMessage.addListener((request, sender, reply) => {
    if (request.type == "full-page-scan") fullScanAndHighlight(reply);
    if (request.type == "highlighted-text-scan") textScanAndHighlight(reply);
    if (request.type == "get-title") reply(document.title);
    if (request.type == "check-full-scan") checkFullScan(reply);
    if (request.type == "check-highlight-scan") checkHighlightScan(reply);
    return true;
});
window.addEventListener("message", function (event) {
    if (event.data.type == "get-filters") getFiltersToIframe();
    if (event.data.type == "show-entity-select") showEntitySelect();
    if (event.data.type == "show-entity-graph") showEntityGraph(event.data, true);
    if (event.data.type == "entity-traversal-back") entityTraversalBack();
    if (event.data.type == "stop-scan") stopScan();
    if (event.data.type == "exit") exitExtension();
    if (event.data.type == "scroll-to-highlight") scrollToHighlight(event.data.highlightNum);
});

/* Callback functions for incoming messages */

/**
 * Grabs the text from the site, sends it to the service worker to scan, then highlights results on page
 * @param {*} reply the reply callback for the message
 */
function fullScanAndHighlight(reply) {
    setupUIOverlays();
    totalRequests = 1;
    finishedRequests = 0;
    loading = true;

    let walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    delayRequest(walk, null, null).then(() => {
        Promise.all(inFlightRequests).then(() => {
            loading = false;
            reply({ type: "success" });
            highlightElements = document.querySelectorAll(".lincs-mark");
        });
    });
}

/**
 * Grabs the highlighted text, sends it to the service worker to scan, then highlights results on page
 * @param {*} reply the reply callback for the message
 */
function textScanAndHighlight(reply) {
    if (window.getSelection && window.getSelection().anchorNode != null) {
        var selection = window.getSelection().getRangeAt(0);
        var selectedText = selection.extractContents();
        var span = document.createElement("span");
        span.appendChild(selectedText);
        selection.insertNode(span);

        setupUIOverlays();
        totalRequests = 1;
        finishedRequests = 0;
        loading = true;

        let walk = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, null);
        delayRequest(walk, null, null).then(() => {
            Promise.all(inFlightRequests).then(() => {
                loading = false;
                reply({ type: "success" });
                highlightElements = document.querySelectorAll(".lincs-mark");
            });
        });
    }
}

/**
 * Returns a boolean that determines if the scall full page button should be enabled
 * @param {*} reply the reply callback for the message
 */
function checkFullScan(reply) {
    if (document.getElementById("lincs-svg-display") == null) {
        reply({ enable: true });
    } else {
        reply({ enable: false });
    }
}

/**
 * Returns a boolean that determines if the scall highlighted text button should be enabled
 * @param {*} reply the reply callback for the message
 */
function checkHighlightScan(reply) {
    if (!window.getSelection || window.getSelection().anchorNode == null || window.getSelection().anchorNode.nodeType != 3 || document.getElementById("lincs-svg-display") != null) {
        reply({ enable: false });
    } else {
        reply({ enable: true });
    }
}

/**
 * Posts a message to the sidebar containing the active filters
 */
function getFiltersToIframe() {
    chrome.runtime.sendMessage({ type: 'get-filters' }, (response) => {
        sidebar.contentWindow.postMessage(
            { type: "return-filters", filters: response.activeFilters },
            "*"
        );
    });
}

/**
 * Displays the select entity list
 */
function showEntitySelect() {
    currentEntity = {
        uri: "http://id.lincsproject.ca",
        label: "Select an Entity",
        page: 1
    }
    popNumEntities(d3Data.mainContainer.length - 1);
    d3Data.mainContainer[0].select('text').text(currentEntity.label);
    sidebar.contentWindow.location.replace(sidebarURL + "entity-select/" + numHighlights + "/100/" + encodeURIComponent(currentTarget.textContent));
    entityList = [];
    removeEntities();
}

/**
 * Displays data bubbles on the graph
 * @param {*} request the incoming request from the message listener
 * @param {*} addToEntityList boolean to add to the entityList
 */
function showEntityGraph(request, addToEntityList) {
    let label = request.label;
    if (label == null) {
        label = request.uri;
    }
    if (label.length > 27) {
        label = label.substring(0, 26) + "...";
    }

    if (addToEntityList) {
        entityList.unshift(request);
    }

    currentEntity = {
        uri: request.uri,
        label: label,
        page: 1
    }
    sidebar.contentWindow.location.replace(sidebarURL + "entity-info/" + encodeURIComponent(JSON.stringify(entityList.map(entity => entity.uri))));
    d3Data.mainContainer[0].select('#main-text').text("Loading...");

    let message = {};
    if (entityList.length == 1) {
        message = { type: 'get-entity-info', uri: request.uri };
    } else if (entityList.length == 2) {
        message = { type: 'get-related-entities', firstURI: entityList[0].uri, secondURI: entityList[entityList.length - 1].uri };
    } else {
        message = { type: 'get-entity-info', uri: request.uri };
    }
    chrome.runtime.sendMessage(message, (response) => {
        if (message.type == "get-entity-info") {
            sidebar.contentWindow.postMessage({ type: "send-entity-info", response: response }, "*");

            // Process response for display
            let output = [];

            for (let triple of response[1][0].triples) {
                if ((entityList.length > 2 && triple.predicate != "http://www.w3.org/2000/01/rdf-schema#label") || triple.predicate == "http://www.cidoc-crm.org/cidoc-crm/P2_has_type" || triple.predicate == "http://www.cidoc-crm.org/cidoc-crm/P3_has_note") {
                    triple.objectIsURI = false;
                    output.push(triple);
                }
            }

            if (entityList.length <= 2) {
                for (let entity of response[0]) {
                    output.push({
                        graph: entity.events[0].graph,
                        predicate: "Entity",
                        predicateLabel: "Entity",
                        object: entity.entity,
                        objectLabel: entity.entityLabel,
                        objectIsURI: true
                    });
                }
            }

            response = output;
        } else {
            sidebar.contentWindow.postMessage({ type: "send-related-entities", response: response, entityName: entityList[0].label }, "*");

            // Process response for display
            let output = [];
            for (let entity of response) {
                let isAnnotation = false; // Prevent annotations from displaying
                let storedEntity = {
                    graph: entity.triples[0].graph,
                    predicate: "",
                    object: entity.resource,
                    objectLabel: entity.resource,
                    objectIsURI: true,
                }

                for (let triple of entity.triples) {
                    if (triple.predicateLabel == "label") {
                        storedEntity.objectLabel = triple.object;
                    } else if (triple.object == "http://www.w3.org/ns/oa#Annotation") {
                        isAnnotation = true;
                    }
                }

                if (!isAnnotation) {
                    output.push(storedEntity);
                }
            }

            response = output;
        }

        d3Data.mainContainer[0].select('#main-text').text(currentEntity.label);
        currentEntity.predicates = response;
        currentEntity.maxPage = Math.ceil(response.length / 6);

        setupPagination();

        drawEntities(currentEntity.predicates.slice(0, 5));
    });
}

/**
 * Returns to the previous focussed entity
 */
function entityTraversalBack() {
    popEntity();
    showEntityGraph(entityList[0], false)
}

/**
 * Stops an in progress scan
 */
function stopScan() {
    loading = false;
    if (numHighlights == 0) {
        exitExtension();
    } else {
        sidebar.contentWindow.location.replace(sidebarURL + "entity-select/" + numHighlights + "/" + 100);
    }
}

/**
 * Exits the extension and cleans up DOM
 */
function exitExtension() {
    document.body.style.width = "inherit";
    document.body.style.position = "inherit";
    document.body.innerHTML = bodyCopy;

    // Reset Globals
    numHighlights = 0;
    inFlightRequests = [];
    sidebar = null;
    activeD3 = null;
    d3Data = {};
    graphDisplayed = false;
    currentTarget = null;
    currentEntity = null;
    entityList = [];
    highlightedWords = [];
    allNodes = [];
}

/**
 * Auto scrolls to the given highlight
 */
function scrollToHighlight(highlightNum) {
    if (focussedHighlight != null) {
        focussedHighlight.style.backgroundColor = '#C2E5FF';
    }
    focussedHighlight = highlightElements[highlightNum];
    focussedHighlight.style.backgroundColor = '#008efa';
    focussedHighlight.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center'
    });
}

/* Helper functions for message callbacks */

/**
 * Displays pagination in center bubble if needed
 */
function setupPagination() {
    if (currentEntity.maxPage > 1) {
        d3Data.mainContainer[0].select('#main-text').attr('transform', 'translate(0, -15)');
        d3Data.mainContainer[0].select('#page-text').text(currentEntity.page + " of " + currentEntity.maxPage);
        d3Data.mainContainer[0].select('#back-button').attr('visibility', 'visible');
        d3Data.mainContainer[0].select('#forward-button').attr('visibility', 'visible');
    }
}

/**
 * Removes the displayed entity bubbles
 */
function removeEntities() {
    if (d3Data.lines != null) {
        d3Data.lines[0].remove();
        d3Data.lines[1].remove();
    }
    d3Data.bubblesContainer[0].selectAll('g.snode').remove();
    d3Data.bubblesContainer[0].selectAll('g.cnode').remove();
    d3Data.mainContainer[0].select('#main-text').attr('transform', 'translate(0, 0)');
    d3Data.mainContainer[0].select('#page-text').text("");
    d3Data.mainContainer[0].select('#back-button').attr('visibility', 'hidden');
    d3Data.mainContainer[0].select('#forward-button').attr('visibility', 'hidden');
}

/**
 * Removes the top entity
 */
function popEntity() {
    // Visual Updates
    removeEntities();
    d3Data.mainContainer[0].remove();
    d3Data.bubblesContainer[0].remove();
    d3Data.highlightLine[0].remove();

    // Data resets
    entityList.shift();
    d3Data.mainContainer.shift();
    d3Data.xMain.shift();
    d3Data.yMain.shift();
    d3Data.highlightLine.shift();
    d3Data.xHighlightLine.shift();
    d3Data.yHighlightLine.shift();
    d3Data.xBubbles.shift();
    d3Data.yBubbles.shift();
    d3Data.bubblesContainer.shift();
    d3Data.placementPath.shift();
    d3Data.placementPathStr.shift();
}

/**
 * Removes a set number of entities from the top
 * @param {*} amount the amount of entities to pop
 */
function popNumEntities(amount) {
    for (let i = 0; i < amount; i++) {
        popEntity();
    }
}

/**
 * Replaces all words found in the triple store with highlighted a tags
 * @param {*} text the parent node to search under
 * @param {*} find the regex expression of what to look for
 * @param {*} replace a function callback to replace the found entries
 */
function replaceInText(text, find, replace, highlightFirst = false) {
    var match;
    var matches = [];
    var foundMatch = false;
    while (match = find.exec(text.nodeValue)) {
        matches.push(match);
        if (highlightFirst) { // If highlighting just the first, break loop on first match
            break;
        }
    }
    for (var i = matches.length; i-- > 0;) {
        match = matches[i];
        text.splitText(match.index);
        text.nextSibling.splitText(match[0].length);
        if (text.parentNode.getAttribute("class") != "lincs-mark") {
            text.parentNode.replaceChild(replace(match), text.nextSibling);
        }
        foundMatch = true;
    }
    return foundMatch;
}

/** 
 * Highlight words on the basis of isFirstOccurrence
 * @param {*} word to find on the page
 * @param {*} nodeArr to search all the nodes
 * @param {*} isFirstOccurrence to check if the toggle to display first occurrence is on/off 
 */
function highlightWordOccurrence(word, nodeArr, isFirstOccurrence) {
    let find = new RegExp('\\b' + word?.replace(/([\|])/g, '\\$1') + '\\b', 'gi');
    for (let searchNode of nodeArr) {
        if (replaceInText(searchNode, find, (match) => {
            let mark = document.createElement('mark');
            mark.style.backgroundColor = '#C2E5FF';

            let link = document.createElement('a');
            link.style.color = 'black';
            link.setAttribute('class', 'lincs-mark');
            link.addEventListener('mouseover', getMatchedEntities);
            link.appendChild(document.createTextNode(match[0]));
            mark.appendChild(link);

            numHighlights += 1;

            return mark;
        }, isFirstOccurrence)) if (isFirstOccurrence) break;
    }
}

/**
 * Makes scan requests to the backend, adding delay according to the requestDelay var
 * @param {*} walk tree walker for all text nodes in the document
 * @param {*} extraNode left over node that fit outside of the scan size
 * @param {*} promiseResolve the resolve callback for the promise triggered when all requests for a page are dispatched
 * @returns a promise identifying when all requests have been initialized
 */
function delayRequest(walk, extraNode, promiseResolve) {
    let node;
    let nodes = [];
    let searchText = '';
    let nextExtraNode = null;

    if (extraNode != null) {
        nodes.push(extraNode);
        allNodes.push(extraNode);
        searchText += ' ' + extraNode.nodeValue.trim() + ' ';
    }

    while (node = walk.nextNode()) {
        if (node != null && node.data.trim().length > 1 && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentNode.tagName)) {
            if (node.parentElement != null && !(node.parentElement.offsetWidth || node.parentElement.offsetHeight || node.parentElement.getClientRects().length)) {
                continue;
            }

            if (searchText.length + node.nodeValue.trim().length > textBatchSize) {
                nextExtraNode = node;
                break;
            }

            nodes.push(node);
            allNodes.push(node);
            searchText += ' ' + node.nodeValue.trim() + ' ';
        }
    }

    inFlightRequests.push(new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'start-scan', text: searchText }, async (response) => {
            var isFirstOccurrence = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'get-settings' }, (response) => {
                    resolve(response.activeSettings.highlight.displayFirstHighlight.value === "checked");
                });
            });
            if (loading) {
                finishedRequests += 1;
                for (let word of response) {
                    if (isFirstOccurrence) {
                        // Highlight only the first instance of a word
                        if (!highlightedWords.includes(word)) {
                            highlightedWords.push(word);
                            highlightWordOccurrence(word, allNodes, true);
                        }
                    } else {
                        highlightWordOccurrence(word, nodes, false); // Highlight all the matched words
                    }
                }

                sidebar.contentWindow.location.replace(sidebarURL + "entity-select/" + numHighlights + "/" + Math.round(finishedRequests / totalRequests * 100));
                resolve();
            }
        });
    }));

    if (loading) {
        if (promiseResolve == null) {
            return new Promise((resolve) => {
                if (node = walk.nextNode()) {
                    setTimeout(() => {
                        totalRequests += 1;
                        delayRequest(walk, nextExtraNode, resolve);
                    }, 10);
                } else {
                    resolve();
                }
            });
        } else {
            if (node = walk.nextNode() || nextExtraNode != null) {
                setTimeout(() => {
                    totalRequests += 1;
                    delayRequest(walk, nextExtraNode, promiseResolve);
                }, requestDelay);
            } else {
                promiseResolve();
            }
        }
    }
}

/* UI Setup Functions */

/**
 * Creates a d3 instance when a plugin scan is started
 */
function setupUIOverlays() {
    bodyCopy = document.body.innerHTML;
    document.body.style.width = "calc(100vw - 350px)";
    document.body.style.position = "relative";
    document.body.style.overflowX = "auto";

    sidebarSelections = document.createElement('div');
    sidebarSelections.style.cssText = "height: 100px; width: 50px; position: fixed; top: 0; right: 350px; z-index: 2147483647; background-color: white;";
    sidebarSelections.innerHTML = `
        <div class="node" style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div class="node" id="lincs-toggle-sidebar" style="width: 50px; height: 50px; cursor: pointer; justify-content: center; align-items: center; display: flex; border: 0.5px solid grey;">
                <svg class="node" id="lincs-minimize" xmlns="http://www.w3.org/2000/svg" width="15" height="30" viewBox="0 0 9 14" fill="none">
                    <path class="node" d="M5.672 7.00001L0.722 11.95L2.136 13.364L8.5 7.00001L2.136 0.636013L0.722 2.05001L5.672 7.00001Z" fill="#525455" stroke-width="1"/>
                </svg>
                <svg class="node" id="lincs-maximize" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="15" height="30" viewBox="0 0 9 14" fill="none">
                    <path class="node" d="M3.32802 7.00001L8.27802 11.95L6.86402 13.364L0.500015 7.00001L6.86402 0.636013L8.27802 2.05001L3.32802 7.00001Z" fill="#525455" stroke-width="1"/>
                </svg>
            </div>
            <div class="node" id="lincs-toggle-vis" style="width: 50px; height: 50px; cursor: pointer; justify-content: center; align-items: center; display: flex; border: 0.5px solid grey;">
                <svg class="node" id="lincs-graph-shown" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 17 16" fill="none">
                    <g class="node" clip-path="url(#clip0_9_112)">
                        <path class="node" d="M7.1 2.82664C7.55889 2.71923 8.02871 2.66554 8.5 2.66664C13.1667 2.66664 15.8333 7.99998 15.8333 7.99998C15.4287 8.75705 14.946 9.4698 14.3933 10.1266M9.91334 9.41331C9.73024 9.60981 9.50944 9.76741 9.26411 9.87673C9.01877 9.98604 8.75394 10.0448 8.4854 10.0496C8.21686 10.0543 7.95011 10.0049 7.70108 9.9043C7.45204 9.80371 7.22582 9.654 7.0359 9.46408C6.84599 9.27416 6.69627 9.04794 6.59568 8.7989C6.49509 8.54987 6.44569 8.28312 6.45043 8.01458C6.45517 7.74604 6.51394 7.48121 6.62326 7.23587C6.73257 6.99054 6.89017 6.76974 7.08667 6.58664M12.46 11.96C11.3204 12.8286 9.93274 13.3099 8.5 13.3333C3.83334 13.3333 1.16667 7.99998 1.16667 7.99998C1.99593 6.45457 3.1461 5.10438 4.54 4.03998L12.46 11.96Z" stroke="#525455" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path class="node" d="M1.16667 0.666687L15.8333 15.3334" stroke="#525455" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </g>
                    <defs class="node">
                        <clipPath class="node" id="clip0_9_112">
                            <rect class="node" width="16" height="16" fill="white" transform="translate(0.5)"/>
                        </clipPath>
                    </defs>
                </svg>
                <svg class="node" id="lincs-graph-hidden" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 17 16" fill="none">
                    <g class="node" clip-path="url(#clip0_17_76)">
                        <g class="node" clip-path="url(#clip1_17_76)">
                            <path class="node" d="M1.16669 8.00002C1.16669 8.00002 3.83335 2.66669 8.50002 2.66669C13.1667 2.66669 15.8334 8.00002 15.8334 8.00002C15.8334 8.00002 13.1667 13.3334 8.50002 13.3334C3.83335 13.3334 1.16669 8.00002 1.16669 8.00002Z" stroke="#083943" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path class="node" d="M8.5 10C9.60457 10 10.5 9.10457 10.5 8C10.5 6.89543 9.60457 6 8.5 6C7.39543 6 6.5 6.89543 6.5 8C6.5 9.10457 7.39543 10 8.5 10Z" stroke="#083943" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </g>
                    </g>
                    <defs class="node">
                        <clipPath class="node" id="clip0_17_76">
                            <rect class="node" width="16" height="16" fill="white" transform="translate(0.5)"/>
                        </clipPath>
                        <clipPath class="node" id="clip1_17_76">
                            <rect class="node" width="16" height="16" fill="white" transform="translate(0.5)"/>
                        </clipPath>
                    </defs>
                </svg>
            </div>
        </div
    `;
    document.body.append(sidebarSelections);
    document.getElementById('lincs-toggle-sidebar').addEventListener('click', toggleSidebar);
    document.getElementById('lincs-toggle-vis').addEventListener('click', toggleDisplayGraph);

    sidebar = document.createElement('iframe');
    sidebar.style.cssText = "width: 350px; height: 100vh; position: fixed; top: 0; right: 0; z-index: 2147483647; background-color: white; border: none; border-left: 1px solid #083943; user-select: none;";
    sidebar.src = sidebarURL + "entity-select/" + numHighlights + "/0";
    document.body.append(sidebar);

    activeD3 = d3.select('body')
        .append('svg')
        .attr('id', 'lincs-svg-display')
        .attr('width', document.documentElement.scrollWidth - 350)
        .attr('height', document.documentElement.scrollHeight)
        .attr('transform', 'translate(' + (-1 * document.body.outerWidth) + ', ' + (-1 * document.body.outerHeight) + ')');

    // Add event listeners for resize and close
    window.addEventListener("resize", debounce(updatePlacement));
    window.addEventListener("keydown", (event) => {
        if (event.key == "Escape") {
            exitGraphDisplay();
        }
    });
    document.onclick = (event) => {
        if (document.getElementById("lincs-svg-display") != null) {
            if (event.target != null && !activeD3._groups[0][0].contains(event.target) && !(event.target.getAttribute("class") != null && event.target.getAttribute("class").includes("node"))) {
                exitGraphDisplay();
            }
        }
    }

}

/**
 * Gets a list of entities
 */
function getMatchedEntities(event) {
    if (!graphDisplayed && !loading) {
        setTimeout(() => {
            let debounceCheck = false;
            document.querySelectorAll(':hover').forEach((el) => {
                if (el == event.target) {
                    debounceCheck = true;
                }
            });

            if (debounceCheck) {
                currentTarget = event.target;
                currentEntity = {
                    uri: "http://id.lincsproject.ca",
                    label: "Select an Entity",
                    page: 1
                }
                sidebar.contentWindow.location.replace(sidebarURL + "entity-select/" + numHighlights + "/100/" + encodeURIComponent(currentTarget.textContent));
                drawGraph();
            }
        }, 250);
    }
}

/**
 * Draws a graph on screen for a matched entity
 */
function drawGraph() {
    if (!graphDisplayed) {
        graphDisplayed = true;
        currentTarget.style.cssText = 'text-decoration: underline; text-decoration-color: #083943; text-decoration-thickness: 2px; color: black;';
        let target = currentTarget.getBoundingClientRect();

        // Container for connecting lines (drawn on bottom of overlay stack)
        d3Data.glines = activeD3.append('g')
            .attr('id', 'lines');

        // Container for exit button
        d3Data.xExit = (target.left + window.scrollX) - ((target.left + window.scrollX) - ((target.width / 2) + (target.left + window.scrollX)));
        d3Data.yExit = (target.top + window.scrollY) - target.height - 10;
        d3Data.exitContainer = activeD3.append('g')
            .attr('transform', 'translate(' + d3Data.xExit + ', ' + d3Data.yExit + ')');

        d3Data.exitContainer.append('circle')
            .attr('r', 15)
            .attr('fill', '#107386')
            .style('cursor', 'pointer')
            .on('click', exitGraphDisplay);

        d3Data.exitContainer.append('path')
            .attr('d', "m 0 0 l 10 10 m -10 0 l 10 -10")
            .attr('transform', 'translate(-5, -5)')
            .attr('stroke', 'white')
            .attr('stroke-width', 3)
            .style('pointer-events', 'none');

        drawEntitySetup(target);
    }
}

/**
 * Draws a main bubble and preps for data bubble placement
 * @param {*} target the target to place the main bubble around
 */
function drawEntitySetup(target) {
    // Initialize storage arrays if needed
    if (d3Data.mainContainer == null) {
        d3Data.mainContainer = [];
        d3Data.xMain = [];
        d3Data.yMain = [];
        d3Data.highlightLine = [];
        d3Data.xHighlightLine = [];
        d3Data.yHighlightLine = [];
        d3Data.xBubbles = [];
        d3Data.yBubbles = [];
        d3Data.bubblesContainer = [];
        d3Data.placementPath = [];
        d3Data.placementPathStr = [];
    }

    if (d3Data.mainContainer.length > 0) {
        calcPlacement(target, false);
    } else {
        calcPlacement(target, true);
    }

    // Container for middle info
    d3Data.mainContainer.unshift(activeD3.append('g')
        .attr('transform', 'translate(' + d3Data.xMain[0] + ', ' + d3Data.yMain[0] + ')'));

    // Background for middle bubble
    d3Data.mainContainer[0].append('rect')
        .attr('rx', 36.5)
        .attr('width', 270)
        .attr('height', 73)
        .attr('fill', '#083943');

    // Text for middle bubble
    d3Data.mainContainer[0].append('text')
        .attr('id', 'main-text')
        .attr('x', 135)
        .attr('y', 36.5)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', 16)
        .attr('font-family', 'Verdana')
        .style('user-select', 'none')
        .text(currentEntity.label);

    // Text for pagination
    d3Data.mainContainer[0].append('text')
        .attr('id', 'page-text')
        .attr('x', 135)
        .attr('y', 36.5)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', 16)
        .attr('font-family', 'Verdana')
        .attr('transform', 'translate(0, 15)')
        .style('user-select', 'none')
        .text("");

    // Back arrow
    d3Data.mainContainer[0].append('circle')
        .attr('id', 'back-button')
        .attr('r', 12)
        .attr('fill', 'white')
        .attr('transform', 'translate(70, 50)')
        .attr('visibility', 'hidden')
        .style('cursor', 'pointer')
        .on('click', decreaseCurrentPage);

    // Back arrow icon
    d3Data.mainContainer[0].append('path')
        .attr('d', "m 10 0 l -10 7.5 l 10 7.5")
        .attr('transform', 'translate(65, 42.5)')
        .attr('stroke', '#083943')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .style('pointer-events', 'none');

    // Forward arrow
    d3Data.mainContainer[0].append('circle')
        .attr('id', 'forward-button')
        .attr('r', 12)
        .attr('fill', 'white')
        .attr('transform', 'translate(200, 50)')
        .attr('visibility', 'hidden')
        .style('cursor', 'pointer')
        .on('click', increaseCurrentPage);

    // Forward arrow icon
    d3Data.mainContainer[0].append('path')
        .attr('d', "m 0 0 l 10 7.5 l -10 7.5")
        .attr('transform', 'translate(196, 42.5)')
        .attr('stroke', '#083943')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .style('pointer-events', 'none');

    // Create line to target
    d3Data.highlightLine.unshift(d3Data.glines.append('line')
        .attr('x1', d3Data.xHighlightLine[0])
        .attr('y1', d3Data.yHighlightLine[0])
        .attr('x2', d3Data.xMain[0] + 135)
        .attr('y2', d3Data.yMain[0] + 36.5)
        .attr('stroke-width', 5)
        .attr('stroke', '#083943')
        .attr('class', 'con-line'));

    // Container for data bubbles
    d3Data.xBubbles.unshift((d3Data.xMain[0] - ((351.115 + d3Data.xMain[0]) - (135 + d3Data.xMain[0]))) + 66);
    d3Data.yBubbles.unshift((d3Data.yMain[0] - ((194.37 + d3Data.yMain[0]) - (36.5 + d3Data.yMain[0]))) + 70);
    d3Data.bubblesContainer.unshift(activeD3.append('g')
        .attr('transform', 'translate(' + d3Data.xBubbles[0] + ', ' + d3Data.yBubbles[0] + ')')
        .attr('id', 'bubbles-group'));

    // Invisible placement path for data bubbles
    d3Data.placementPath.unshift(d3Data.bubblesContainer[0].append('path')
        .attr('d', d3Data.placementPathStr[0])
        .attr('style', 'pointer-events: none;')
        .attr('fill', 'rgba(0, 0, 0, 0)'));
}

/**
 * Draws data bubbles on a graph
 * @param {*} nodes the list of nodes to display
 */
function drawEntities(nodes) {
    if (graphDisplayed && nodes.length > 0) {
        let dataProperties = [];

        nodes.forEach((n, i) => {
            let coord = circleCoord(d3Data.placementPath[0], i, nodes.length);
            n.x = coord.x;
            n.y = coord.y;
        });

        // Split circle and square nodes
        for (let i = 0; i < nodes.length; i++) {
            if (!nodes[i].objectIsURI) {
                dataProperties.push(nodes[i]);
                nodes.splice(i, 1);
                i--;
            }
        };

        // Display nodes
        drawSquareNodes(dataProperties);
        drawCircleNodes(nodes);

        // Create connecting lines
        d3Data.lines = [];

        d3Data.lines[0] = d3Data.glines.selectAll('con-line')
            .data(nodes).enter().append('line')
            .attr('x1', d3Data.xMain[0] + 135)
            .attr('y1', d3Data.yMain[0] + 36.5)
            .attr('x2', d => d.x + d3Data.xBubbles[0])
            .attr('y2', d => d.y + d3Data.yBubbles[0])
            .attr('stroke-width', 5)
            .attr('stroke', '#083943')
            .attr('class', 'con-line');

        d3Data.lines[1] = d3Data.glines.selectAll('con-line')
            .data(dataProperties).enter().append('line')
            .attr('x1', d3Data.xMain[0] + 135)
            .attr('y1', d3Data.yMain[0] + 36.5)
            .attr('x2', d => d.x + d3Data.xBubbles[0])
            .attr('y2', d => d.y + d3Data.yBubbles[0])
            .attr('stroke-width', 5)
            .attr('stroke', '#083943')
            .attr('class', 'con-line');
    }
}

/* Helper functions for UI setup functions */

/**
 * Draws square nodes for drawEntities
 * @param {*} nodes the nodes to draw
 */
function drawSquareNodes(nodes) {
    let snodes = d3Data.bubblesContainer[0].selectAll('g.snode')
        .data(nodes).enter().append('g')
        .attr('transform', d => 'translate(' + (d.x - 75) + ',' + (d.y - 75) + ')')
        .classed('snode', true);

    snodes.append('rect') // Create data bubbles
        .attr('width', 150)
        .attr('height', 150)
        .attr('rx', 25)
        .attr('stroke-width', 5)
        .attr('stroke', '#083943')
        .attr('fill', 'white')
        .attr('class', 'node');

    snodes.append('foreignObject') // Create data text
        .attr('x', 10)
        .attr('y', 7.5)
        .attr('width', 130)
        .attr('height', 135)
        .style('pointer-events', 'none')
        .append('xhtml:span')
        .style('color', 'black')
        .style('font-size', '14px')
        .style('font-family', 'Verdana')
        .style('line-height', 'initial')
        .style('user-select', 'none')
        .style('pointer-events', 'none')
        .style('margin', 0)
        .style('width', '130px')
        .style('height', '135px')
        .style('text-align', 'center')
        .style('overflow-wrap', 'break-word')
        .style('overflow', 'hidden')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'space-around')
        .style('display', '-webkit-box')
        .style('-webkit-line-clamp', 4)
        .style('-webkit-box-orient', 'vertical')
        .style('-webkit-box-pack', 'center')
        .html((d) => {
            let label = d.object;
            if (d.objectLabel != null) {
                label = d.objectLabel;
            }
            return label;
        });
}

/**
 * Draws circle nodes for drawEntities
 * @param {*} nodes the nodes to draw
 */
function drawCircleNodes(nodes) {
    let cnodes = d3Data.bubblesContainer[0].selectAll('g.cnode')
        .data(nodes).enter().append('g')
        .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
        .classed('cnode', true);

    cnodes.append('circle') // Create data bubbles
        .attr('r', 75)
        .attr('stroke-width', 5)
        .attr('stroke', '#083943')
        .attr('fill', 'white')
        .attr('class', 'node')
        .attr('cursor', 'pointer')
        .on('click', (d) => {
            if (d.target.__data__.objectLabel != null) {
                addNewFocus({
                    type: "show-entity-graph",
                    label: d.target.__data__.objectLabel,
                    uri: d.target.__data__.object
                });
            }
        });

    cnodes.append('foreignObject') // Create data text
        .attr('x', -60)
        .attr('y', -35)
        .attr('width', 120)
        .attr('height', 70)
        .style('pointer-events', 'none')
        .append('xhtml:span')
        .style('color', 'black')
        .style('font-size', '14px')
        .style('font-family', 'Verdana')
        .style('line-height', 'initial')
        .style('user-select', 'none')
        .style('pointer-events', 'none')
        .style('margin', 0)
        .style('width', '120px')
        .style('height', '70px')
        .style('text-align', 'center')
        .style('overflow-wrap', 'break-word')
        .style('overflow', 'hidden')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('justify-content', 'space-around')
        .style('display', '-webkit-box')
        .style('-webkit-line-clamp', 4)
        .style('-webkit-box-orient', 'vertical')
        .style('-webkit-box-pack', 'center')
        .html((d) => {
            let label = d.object;
            if (d.objectLabel != null) {
                label = d.objectLabel;
            }
            return label;
        });
}

/**
 * Updates the focussed entity
 * @param {*} entity the entity object of the newly selected entity
 */
function addNewFocus(entity) {
    removeEntities();
    currentEntity = {
        uri: "http://id.lincsproject.ca",
        label: "Loading...",
        page: 1
    }

    let target = currentTarget.getBoundingClientRect();
    drawEntitySetup(target);
    showEntityGraph(entity, true);
}

/**
 * Increases the page displayed on the graph
 */
function increaseCurrentPage() {
    if (currentEntity.page != currentEntity.maxPage) {
        currentEntity.page += 1;
    }
    d3Data.bubblesContainer[0].selectAll('g.snode').remove();
    d3Data.bubblesContainer[0].selectAll('g.cnode').remove();
    d3Data.lines[0].remove();
    d3Data.lines[1].remove();
    drawEntities(currentEntity.predicates.slice((currentEntity.page * 5) - 5, (currentEntity.page * 5)));
    d3Data.mainContainer[0].select('#page-text').text(currentEntity.page + " of " + currentEntity.maxPage);
}

/**
 * Decreases the page displayed on the graph
 */
function decreaseCurrentPage() {
    if (currentEntity.page != 1) {
        currentEntity.page -= 1;
    }
    d3Data.bubblesContainer[0].selectAll('g.snode').remove();
    d3Data.bubblesContainer[0].selectAll('g.cnode').remove();
    d3Data.lines[0].remove();
    d3Data.lines[1].remove();
    drawEntities(currentEntity.predicates.slice((currentEntity.page * 5) - 5, (currentEntity.page * 5)));
    d3Data.mainContainer[0].select('#page-text').text(currentEntity.page + " of " + currentEntity.maxPage);
}

/**
 * Toggle hide the sidebar
 */
function toggleSidebar() {
    if (sidebar.style.display == "none") {
        sidebar.style.display = "unset";
        document.body.style.width = "calc(100vw - 350px)";
        sidebarSelections.style.right = "350px";
        document.getElementById("lincs-maximize").style.display = "none";
        document.getElementById("lincs-minimize").style.display = "unset";
    } else {
        sidebar.style.display = "none";
        document.body.style.width = "100vw";
        sidebarSelections.style.right = "0px"
        document.getElementById("lincs-maximize").style.display = "unset";
        document.getElementById("lincs-minimize").style.display = "none";
    }
    updatePlacement();
}

/**
 * Toggle display graph
 */
function toggleDisplayGraph() {
    if (document.getElementById("lincs-svg-display").style.display == "none") {
        document.getElementById("lincs-svg-display").style.display = "unset";
        document.getElementById("lincs-graph-shown").style.display = "unset";
        document.getElementById("lincs-graph-hidden").style.display = "none";
    } else {
        document.getElementById("lincs-svg-display").style.display = "none";
        document.getElementById("lincs-graph-shown").style.display = "none";
        document.getElementById("lincs-graph-hidden").style.display = "unset";
    }
}

/**
 * Calculate element placement based on target proximity to edge
 * @param {*} target the highlighted element
 * @param {*} firstBubble a boolean indicating the drawing method
 */
function calcPlacement(target, firstBubble) {
    let scale = 60;
    let leftBounds = false, rightBounds = false;
    if (firstBubble) { // If this is the first bubble drawn
        if (((target.left + window.scrollX) + (target.width / 2) - 330) < 0) { // Handle out of bounds on left
            leftBounds = true;
            d3Data.xMain.unshift((target.left + window.scrollX) + target.width + 10);
            d3Data.yMain.unshift((target.top + window.scrollY) + (target.height / 2) - 36.5);

            d3Data.xHighlightLine.unshift((target.left + window.scrollX) + target.width);
            d3Data.yHighlightLine.unshift((target.top + window.scrollY) + (target.height / 2));

            d3Data.placementPathStr.unshift(`m ${2.5 * scale} ${4 * scale} c ${9 * scale} ${6 * scale} ${9 * scale} ${-10 * scale} 0 ${-4 * scale}`);
        } else if (((target.left + window.scrollX) + (target.width / 2) + 330) > (document.documentElement.scrollWidth - 350)) { // Handle out of bounds on right
            rightBounds = true;
            d3Data.xMain.unshift((target.left + window.scrollX) - (270 + 10));
            d3Data.yMain.unshift((target.top + window.scrollY) + (target.height / 2) - 36.5);

            d3Data.xHighlightLine.unshift(target.left + window.scrollX);
            d3Data.yHighlightLine.unshift((target.top + window.scrollY) + (target.height / 2));

            d3Data.placementPathStr.unshift(`m ${7 * scale} 0 c ${-9 * scale} ${-6 * scale} ${-9 * scale} ${10 * scale} 0 ${4 * scale}`);
        } else if ((target.top + window.scrollY) + target.height + 275 + 10 > document.documentElement.scrollHeight) { // Handle out of bounds on bottom
            d3Data.xMain.unshift((target.left + window.scrollX) - ((135 + (target.left + window.scrollX)) - ((target.width / 2) + (target.left + window.scrollX))));
            d3Data.yMain.unshift((target.top + window.scrollY) - (73 + 10));

            d3Data.xHighlightLine.unshift((target.left + window.scrollX) + (target.width / 2));
            d3Data.yHighlightLine.unshift(target.top + window.scrollY);

            d3Data.placementPathStr.unshift(`m ${2 * scale} ${4.5 * scale} c ${-8 * scale} ${-7 * scale} ${13.5 * scale} ${-7 * scale} ${5.5 * scale} 0`);
        } else { // Default placement
            d3Data.xMain.unshift((target.left + window.scrollX) - ((135 + (target.left + window.scrollX)) - ((target.width / 2) + (target.left + window.scrollX))));
            d3Data.yMain.unshift((target.top + window.scrollY) + target.height + 10);

            d3Data.xHighlightLine.unshift((target.left + window.scrollX) + (target.width / 2));
            d3Data.yHighlightLine.unshift((target.top + window.scrollY) + target.height);

            d3Data.placementPathStr.unshift(`m ${2 * scale} 0 c ${-8 * scale} ${7 * scale} ${13.5 * scale} ${7 * scale} ${5.5 * scale} 0`);
        }

        if ((rightBounds || leftBounds) && (d3Data.yMain[0] + 36.5 - 257.5) < 0) { // Handle out of bounds on top corners
            d3Data.yMain[0] = d3Data.yMain[0] + (-1 * (d3Data.yMain[0] + 36.5 - 257.5)) + 20;
            if (leftBounds) {
                d3Data.xMain[0] = d3Data.xMain[0] + 20;
            } else {
                d3Data.xMain[0] = d3Data.xMain[0] - 20;
            }
        } else if ((rightBounds || leftBounds) && (d3Data.yMain[0] + 36.5 + 257.5) > document.documentElement.scrollHeight) { // Handle out of bounds on bottom corners
            d3Data.yMain[0] = d3Data.yMain[0] - ((d3Data.yMain[0] + 36.5 + 257.5) - document.documentElement.scrollHeight) - 40;
            if (leftBounds) {
                d3Data.xMain[0] = d3Data.xMain[0] + 20;
            } else {
                d3Data.xMain[0] = d3Data.xMain[0] - 20;
            }
        }
    } else { // If this is a bubble traversal drawn
        d3Data.xMain.unshift(d3Data.xMain[0]);
        d3Data.yMain.unshift(d3Data.yMain[0] + 77.5);
        d3Data.xHighlightLine.unshift(d3Data.xMain[0] + 135);
        d3Data.yHighlightLine.unshift(d3Data.yMain[0] - 10);
        d3Data.placementPathStr.unshift(`m ${2 * scale} 0 c ${-8 * scale} ${7 * scale} ${13.5 * scale} ${7 * scale} ${5.5 * scale} 0`);
    }
}

/**
 * Debounce an event listener to wait for the end of the action
 * @param {*} func the function to run at the end of the action
 * @returns a timeout function
 */
function debounce(func) {
    var timer;
    return function (event) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(func, 100, event);
    };
}

/**
 * Evenly spaces nodes along arc
 * @param {*} node 
 * @param {*} index 
 * @param {*} num_nodes 
 * @returns 
 */
function circleCoord(placementCircle, index, num_nodes) {
    var circumference = placementCircle.node().getTotalLength();
    var pointAtLength = function (l) { return placementCircle.node().getPointAtLength(l) };
    var sectionLength = (circumference) / num_nodes;
    var position = sectionLength * index + sectionLength / 2;
    return pointAtLength(circumference - position)
}

/**
 * Updates the placement of dynamic elements when the screen changes size
 */
function updatePlacement() {
    if (activeD3 != null) {
        activeD3.attr('width', 0)
            .attr('height', 0);

        activeD3.attr('width', document.documentElement.scrollWidth - 350)
            .attr('height', document.documentElement.scrollHeight)
            .attr('transform', 'translate(' + (-1 * document.body.outerWidth) + ', ' + (-1 * document.body.outerHeight) + ')');
    }

    if (graphDisplayed) {
        let target = currentTarget.getBoundingClientRect();

        d3Data.xExit = (target.left + window.scrollX) - ((target.left + window.scrollX) - ((target.width / 2) + (target.left + window.scrollX)));
        d3Data.yExit = (target.top + window.scrollY) - target.height - 10;
        d3Data.exitContainer.attr('transform', 'translate(' + d3Data.xExit + ', ' + d3Data.yExit + ')');

        d3Data.xMain = [];
        d3Data.yMain = [];
        d3Data.xHighlightLine = [];
        d3Data.yHighlightLine = [];
        d3Data.placementPathStr = [];
        for (let i = d3Data.mainContainer.length - 1; i > -1; i--) {
            if (i != d3Data.mainContainer.length - 1) {
                calcPlacement(target, false);
            } else {
                calcPlacement(target, true);
            }

            d3Data.mainContainer[i].attr('transform', 'translate(' + d3Data.xMain[0] + ', ' + d3Data.yMain[0] + ')');

            d3Data.highlightLine[i].attr('x1', d3Data.xHighlightLine[0])
                .attr('y1', d3Data.yHighlightLine[0])
                .attr('x2', d3Data.xMain[0] + 135)
                .attr('y2', d3Data.yMain[0] + 36.5);

            d3Data.xBubbles[i] = (d3Data.xMain[0] - ((351.115 + d3Data.xMain[0]) - (135 + d3Data.xMain[0]))) + 66;
            d3Data.yBubbles[i] = (d3Data.yMain[0] - ((194.37 + d3Data.yMain[0]) - (36.5 + d3Data.yMain[0]))) + 70;
            d3Data.bubblesContainer[i].attr('transform', 'translate(' + d3Data.xBubbles[i] + ', ' + d3Data.yBubbles[i] + ')');
            d3Data.placementPath[i].attr('d', d3Data.placementPathStr[0]);
        }

        if (d3Data.lines != null && currentEntity != null) {
            removeEntities();
            drawEntities(currentEntity.predicates.slice((currentEntity.page * 6) - 6, (currentEntity.page * 6) - 1));
            setupPagination();
        }
    }
}

/**
 * Exits the ui display when showing a graph on a target
 */
function exitGraphDisplay() {
    if (graphDisplayed) {
        currentTarget.style.cssText = 'color: black;';
        d3Data.exitContainer.remove();
        d3Data.glines.remove();

        // Resets
        for (let i = 0; i < d3Data.mainContainer.length; i++) {
            d3Data.mainContainer[i].remove();
            d3Data.bubblesContainer[i].remove();
        }
        entityList = [];
        d3Data.mainContainer = [];
        d3Data.xMain = [];
        d3Data.yMain = [];
        d3Data.highlightLine = [];
        d3Data.xHighlightLine = [];
        d3Data.yHighlightLine = [];
        d3Data.xBubbles = [];
        d3Data.yBubbles = [];
        d3Data.bubblesContainer = [];
        d3Data.placementPath = [];
        d3Data.placementPathStr = [];

        graphDisplayed = false;
        sidebar.contentWindow.location.replace(sidebarURL + "entity-select/" + numHighlights + "/100");

        let mouseoverEvent = new Event('mouseover');
        document.querySelectorAll(':hover').forEach(el => el.dispatchEvent(mouseoverEvent));
    }
}

/**
 * Defines an outerHeight property on all elements
 */
Object.defineProperty(Element.prototype, 'outerHeight', {
    'get': function () {
        var computedStyle = window.getComputedStyle(this);
        return parseInt(computedStyle.marginTop, 10);
    }
})

/**
 * Defines an outerWidth property on all elements
 */
Object.defineProperty(Element.prototype, 'outerWidth', {
    'get': function () {
        var computedStyle = window.getComputedStyle(this);
        return parseInt(computedStyle.marginLeft, 10);
    }
})

