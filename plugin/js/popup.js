let activeFiltersForNer = []; // To store all the active filters for ner labels
let activeFiltersForGraph = []; // To store all the active filters for graph labels
let activeSettings = {}; // To store all the active settings
let filterLabels = {
    "EVENT": "Named events",
    "FAC": "Facilities (Buildings, airports, highways, etc.)",
    "GPE": "Countries, cities, states",
    "LAW": "Named documents made into law",
    "LOC": "Non-state locations (mountains, bodies of water)",
    "NORP": "Nationalities, religious or pollitical groups",
    "ORG": "Organizations",
    "PERSON": "People",
    "PRODUCT": "Objects, vehicles, food items, etc.",
    "WORK_OF_ART": "Works of art (books, songs, paintings)",
    "http://graph.lincsproject.ca/adarchive": "Adarchive",
    "http://graph.lincsproject.ca/anthologiaPalatina": "Anthologia Palatina",
    "http://graph.lincsproject.ca/ethnomusicology": "Ethnomusicology",
    "http://graph.lincsproject.ca/histsex": "HistSex",
    "http://graph.lincsproject.ca/moeml": "MOEML",
    "http://graph.lincsproject.ca/orlando": "Orlando",
    "http://graph.lincsproject.ca/usaskart": "USaskArt",
    "http://graph.lincsproject.ca/yellowNineties": "Yellow Nineties"
} // Stores all the proper text versions of ner and graph type filters

/* Page loading functions */

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: "check-full-scan" }, (response) => {
        if (response.enable === false) {
            document.getElementById("full-scan-button").setAttribute("class", "btn btn-disabled");
        }
    });
    chrome.tabs.sendMessage(tabs[0].id, { type: "check-highlight-scan" }, (response) => {
        if (response.enable === false) {
            document.getElementById("highlighted-scan-button").setAttribute("class", "btn btn-disabled");
        }
    });
    chrome.tabs.sendMessage(tabs[0].id, { type: "get-title" }, (response) => {
        if (response) {
            if (response.length > 40) {
                document.getElementById("article-title").innerHTML += response.substr(0, 40) + "...";
                document.getElementById("article-title-tooltip").innerHTML += response;
            } else {
                document.getElementById("article-title").innerHTML = response;
            }
        } else {
            document.getElementById("article-title").innerHTML = "Article Title";
        }
    });
});

/* Event Listeners */

document.getElementById("full-scan-button").addEventListener("click", scanFullPage); // Start a full page scan
document.getElementById("highlighted-scan-button").addEventListener("click", scanHighlightedText); // Start a highlighted text scan
document.getElementById("get-filter").addEventListener("click", displayFilterPanel); // Get all filters from the service worker and display filter page
document.getElementById("settings-icon").addEventListener("click", displaySettingsPanel); // To open settings panel
document.getElementById("filters-back-button").addEventListener("click", onBackButton); // Return to main menu
document.getElementById("settings-back-button").addEventListener("click", onBackButton); // Return to main menu
document.getElementById("entity-type-filter").addEventListener("click", toggleDrawer); // To toggle active class on the entity type filters
document.getElementById("dataset-filter").addEventListener("click", toggleDrawer); // To toggle active class on the dataset filters
document.getElementById("highlight-setting").addEventListener("click", toggleDrawer); // To toggle active class on the highlight settings panel

/* Callback Functions */

/**
 * Calls the content script on page to begin scanning a page
 */
function scanFullPage() {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("loader-block").style.display = "flex";
    window.close();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "full-page-scan" }, (response) => {
            if (response && response.type == "success") {
                document.getElementById("main-menu").style.display = "block";
                document.getElementById("loader-block").style.display = "none";
                document.getElementById("full-scan-button").setAttribute("class", "btn btn-disabled");
                document.getElementById("highlighted-scan-button").setAttribute("class", "btn btn-disabled");
            }
        });
    });
}

/**
 * Calls the content script on page to begin scanning highlighted text
 */
function scanHighlightedText() {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("loader-block").style.display = "flex";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "highlighted-text-scan" }, (response) => {
            if (response && response.type == "success") {
                document.getElementById("main-menu").style.display = "block";
                document.getElementById("loader-block").style.display = "none";
                document.getElementById("full-scan-button").setAttribute("class", "btn btn-disabled");
                document.getElementById("highlighted-scan-button").setAttribute("class", "btn btn-disabled");
            }
        });
    });
}


/** 
 * To display the filter panel 
 */
function displayFilterPanel() {
    const mainBox = document.getElementsByClassName("main-box");
    mainBox[0].classList.add("main-box-scroll");
    const featurePanel = document.getElementsByClassName("feature-panel");
    featurePanel[0].style.height = "auto";
    addFilters();
    showFilterSection();
}

/**
 * Display the settings panel 
 */
 function displaySettingsPanel() {
    const togglePanel = document.getElementById("settings-panel");
    togglePanel.classList.add('show-panel');
    addSettings(); // Helper function to pre-fetch the values for the slider
}

/**
 * Returns to the previous page 
 */
function onBackButton(event) {
    if (event.target.id === "settings-back-button") {
        let togglePanel = document.getElementById("settings-panel");
        togglePanel.classList.remove('show-panel');
    } else if (event.target.id === "filters-back-button") {
        let mainBox = document.getElementsByClassName("main-box");
        mainBox[0].classList.remove("main-box-scroll");
        document.getElementById("main-menu").style.display = "block";
        document.getElementById("onLoadFilters").classList.remove('panel-show');
    }
}

/** 
 * To toggle all the type of filters and settings 
 */
function toggleDrawer(event) {
    const drawerToToggle = document.getElementsByClassName("feature-link"); // Catch the content for the class taggled
    const toggleContent = document.getElementsByClassName("filter-data-show"); // Catch the element containing the data for the class toggled
    if (event.target.id === "entity-type-filter") { // If the class toggled is for the NER Type Filter in the filter panel
        drawerToToggle[2].classList.toggle("active");
        toggleContent[0].classList.toggle("active");
        if (!drawerToToggle[2].classList.contains("active")) {
            drawerToToggle[3].classList.add("active");
            toggleContent[1].classList.remove("active");
        }
    } else if (event.target.id === "dataset-filter") { // If the class toggled is for the Dataset Filter in the filter panel
        drawerToToggle[3].classList.toggle("active");
        toggleContent[1].classList.toggle("active");
        if (!drawerToToggle[3].classList.contains("active")) {
            drawerToToggle[2].classList.add("active");
            toggleContent[0].classList.remove("active");
        }
    } else if (event.target.id === "highlight-setting") { // If the class toggled is for the Highlight Settings in the settings panel
        if (drawerToToggle[5].classList.contains("active")) {
            drawerToToggle[5].classList.remove("active");
            toggleContent[2].classList.add("active");
        } else {
            drawerToToggle[5].classList.add("active");
            toggleContent[2].classList.remove("active");
        }
    }
}

/* Helper Functions */

/**
 * Gets all filters available for ner and graph
 */
function addFilters() {
    chrome.runtime.sendMessage({ type: 'get-filters' }, (response) => {
        if (response) {
            activeFiltersForNer = response.activeFilters.ner;
            let absentFilters = response.allFilters.ner.filter(val => !response.activeFilters.ner.includes(val));
            let filterLabelElement = "";
            response.allFilters.ner.forEach(nerLabel => {
                filterLabelElement += generateCheckbox(nerLabel, absentFilters);
            });

            activeFiltersForGraph = response.activeFilters.graph;
            let absentFiltersForGraph = response.allFilters.graph.filter(valForGraph => !response.activeFilters.graph.includes(valForGraph));
            let filterLabelElementGraph = "";
            response.allFilters.graph.forEach(graphLabel => {
                filterLabelElementGraph += generateCheckbox(graphLabel, absentFiltersForGraph);
            });

            document.getElementById("show-filters").innerHTML = filterLabelElement;
            addCheckBoxActionListener(response.allFilters.ner, 'ner');
            document.getElementById("show-graph-filters").innerHTML = filterLabelElementGraph;
            addCheckBoxActionListener(response.allFilters.graph, 'graph');
        }
    });
}

/**
 * Fetch all the highlight settings available
 */
 function addSettings() {
    chrome.runtime.sendMessage({ type: 'get-settings' }, (response) => { // Fetch the list of all the settings  
        if (response) {
            activeSettings = response.activeSettings;

            let checkboxes = [];
            let checkboxKeys = [];
            let ranges = [];
            let rangeKeys = [];

            let highlightSetting = "";
            for (let key in activeSettings.highlight) {
                let setting = activeSettings.highlight[key];

                if (setting.type == "range") {
                    ranges.push(setting.label);
                    rangeKeys.push(key);

                    highlightSetting += `
                        <li>
                            <span class="feature-text relevance-score">${setting.label}</span>
                            <div class="slide-btn-container slide-btn-container settings-switch">
                                <input id="${setting.label}" type="range" min="1" max="20" value=${setting.value - 80} class="slider-panel" />
                                <span id="range-value-${key}">${setting.value - 80}</span>
                            </div>
                        </li>
                    `;
                } else {
                    checkboxes.push(setting.label);
                    checkboxKeys.push(key);

                    highlightSetting += `
                        <li>
                            <div class="settings-switch">
                                <span>${setting.label}</span>
                                <label class="custom-switch">
                                    <input type="checkbox" id="${setting.label}" ${setting.value}>
                                    <span class="slider-round"></span>
                                </label>
                            </div>
                        </li>
                    `;
                }
            }
            document.getElementById("show-highlight-settings").innerHTML = highlightSetting;
            addRangeActionListener(ranges, "highlight", rangeKeys);
            addCheckBoxActionListener(checkboxes, "highlight", checkboxKeys);
        }
    });
}

/** 
 * Generate a checkbox
 */
function generateCheckbox(labelType, absentLabelType) {
    let filterLabelElement = "";
    for (const graphFilterLabels in filterLabels) {
        if (graphFilterLabels === labelType) {
            let isCheckedForGraph = "checked";
            if (absentLabelType.includes(labelType)) {
                isCheckedForGraph = "";
            }
            filterLabelElement += `
            <li>
                <label class="custom-checkbox"><span>${filterLabels[graphFilterLabels]}</span><div>
                    <input type="checkbox" id="${labelType}" ${isCheckedForGraph} />
                    <span class="checkmark"></span>
                </div>
                </label>
            </li>
            `;
        }
    }
    return filterLabelElement;
}

/**
 *  Adds an action listener to a checkbox
 */
function addCheckBoxActionListener(labels, typeOfCheckbox, objectKeys) {
    labels.forEach((checkedLabel, index) => {
        const changeLabel = document.getElementById(checkedLabel);
        if (changeLabel) {
            let key = objectKeys == null ? null : objectKeys[index];
            document.getElementById(checkedLabel).addEventListener('change', (e) => onChecked(e, typeOfCheckbox, key)); // On change of checkbox use helper function
        }
    });
}


/**
 *  Adds an action listener to a range
 */
function addRangeActionListener(labels, typeOfRange, objectKeys) {
    labels.forEach((checkedLabel, index) => {
        const changeLabel = document.getElementById(checkedLabel);
        if (changeLabel) {
            let key = objectKeys == null ? null : objectKeys[index];

            document.getElementById(checkedLabel).addEventListener('change', (e) => onSlideRange(e, typeOfRange, key));

            document.getElementById(checkedLabel).addEventListener('input', (e) => {
                document.getElementById("range-value-" + key).innerHTML = e.target.value;
            });
        }
    });
}

/**
 * Callback for checkbox change event
 */
function onChecked(event, type, key) {
    if (type === 'ner') {
        if (event.target.checked) {
            if (!activeFiltersForNer.includes(event.target.id)) {
                activeFiltersForNer.push(event.target.id);
                chrome.runtime.sendMessage({ type: 'set-filters', filters: { ner: activeFiltersForNer, graph: activeFiltersForGraph } });
            }
        } else {
            var index = activeFiltersForNer.indexOf(event.target.id);
            if (index > -1) {
                activeFiltersForNer.splice(index, 1);
                chrome.runtime.sendMessage({ type: 'set-filters', filters: { ner: activeFiltersForNer, graph: activeFiltersForGraph } });
            }
        }
    } else if (type === 'graph') {
        if (event.target.checked) {
            if (!activeFiltersForGraph.includes(event.target.id)) {
                activeFiltersForGraph.push(event.target.id);
                chrome.runtime.sendMessage({ type: 'set-filters', filters: { ner: activeFiltersForNer, graph: activeFiltersForGraph } });
            }
        } else {
            var index = activeFiltersForGraph.indexOf(event.target.id);
            if (index > -1) {
                activeFiltersForGraph.splice(index, 1);
                chrome.runtime.sendMessage({ type: 'set-filters', filters: { ner: activeFiltersForNer, graph: activeFiltersForGraph } });
            }
        }
    } else if (type === 'highlight') {
        if (event.target.checked) {
            activeSettings.highlight[key].value = "checked";
            chrome.runtime.sendMessage({ type: 'set-settings', settings: activeSettings });
        } else {
            activeSettings.highlight[key].value = "unchecked";
            chrome.runtime.sendMessage({ type: 'set-settings', settings: activeSettings });
        }
    }
}

/**
 * Callback for slider change event
 */
 function onSlideRange(event, type, key) {
    if (type === 'highlight') {
        let sliderRange = event.target.value;
        activeSettings.highlight[key].value = parseInt(sliderRange) + 80;
        chrome.runtime.sendMessage({ type: 'set-settings', settings: activeSettings });
    }
}

/**
 * Display filter selection page
 */
function showFilterSection() {
    document.getElementById("main-menu").classList.add('main-menu-hide');
    document.getElementById("onLoadFilters").classList.add('panel-show');
    document.getElementById("show-graph-filters").style.display = "block";
}