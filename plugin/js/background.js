const queryChunkSize = 10; // This is the size for batching triplestore queries
const spaCyURL = "https://spacy.lincsproject.ca/entities"; // This is the url for spaCy NER lookup
const entityInfoURL = "https://authority.lincsproject.ca/entity?data="; // This is the url for getting all triples associated with an entity
const aggregationURL = "https://authority.lincsproject.ca/linked?data="; // This is the url for getting a list of relationships on a subject
const doubleAggregationURL = "https://authority.lincsproject.ca/links?data="; // This is the url for getting a list of relationships between two subjects
const reconciliationURL = "https://authority.lincsproject.ca/reconcile/any"; // This is the url for getting a list of candidate matches on a text
const language = "en"; // This is the language for spaCy NER lookup
const allFilters = {
    ner: ["EVENT", "FAC", "GPE", "LAW", "LOC", "NORP", "ORG", "PERSON", "PRODUCT", "WORK_OF_ART"],
    graph: [
        "http://graph.lincsproject.ca/adarchive",
        "http://graph.lincsproject.ca/anthologiaPalatina",
        "http://graph.lincsproject.ca/ethnomusicology",
        "http://graph.lincsproject.ca/histsex",
        "http://graph.lincsproject.ca/moeml",
        "http://graph.lincsproject.ca/orlando",
        "http://graph.lincsproject.ca/usaskart",
        "http://graph.lincsproject.ca/yellowNineties"
    ],
    type: [
        "http://iflastandards.info/ns/fr/frbr/frbroo/F1_Work",
        "http://iflastandards.info/ns/fr/frbr/frbroo/F2_Expression",
        "http://iflastandards.info/ns/fr/frbr/frbroo/F18_Serial_Work",
        "http://www.cidoc-crm.org/cidoc-crm/E22_Man-Made_Object",
        "http://www.cidoc-crm.org/cidoc-crm/E38_Image",
        "http://www.cidoc-crm.org/cidoc-crm/E36_Visual_Item",
        "http://www.ics.forth.gr/isl/CRMdig/D1_Digital_Object",
        "http://www.cidoc-crm.org/cidoc-crm/E39_Actor",
        "http://www.cidoc-crm.org/cidoc-crm/E21_Person",
        "http://www.cidoc-crm.org/cidoc-crm/E74_Group",
        "http://www.cidoc-crm.org/cidoc-crm/E53_Place"
    ]
}; // This is a list of NER entities that are possible for filtering
const allSettings = {
    display: [],
    highlight: {
        displayFirstHighlight: {
            type: "switch",
            label: "Display First Occurence Only",
            value: "unchecked"
        },
        highlightRelevanceScore: {
            type: "range",
            label: "Highlight Relevance Score",
            value: 90
        }
    }
} // This is an object for the settings page

/* Message listener and dispatcher */
chrome.runtime.onMessage.addListener((request, sender, reply) => {

    if (request.type == "start-scan") startScan(request, reply);
    if (request.type == "get-entity-info") getEntityInfo(request, reply);
    if (request.type == "get-related-entities") getRelatedEntities(request, reply);
    if (request.type == "get-filters") getFilters(reply);
    if (request.type == "set-filters") setFilters(request, reply);
    if (request.type == "get-settings") getSettings(reply);
    if (request.type == "set-settings") setSettings(request, reply);
    return true;
});

/* Callback functions for incoming messages */

/**
 * Takes text from the page as input, runs NER lookup and Queries triplestore for matches
 * @param {*} request the incoming request from the message listener
 * @param {*} reply the reply callback for the message
 * @return An array of words that have been matched to entities, organized from longest to shortest word length
 */
function startScan(request, reply) {
    nerLookup(request.text).then((entities) => {
        chrome.storage.sync.get("active-settings", (settings) => {
            chrome.storage.sync.get("active-filters", (filters) => {
                settings = settings["active-settings"] == null ? allSettings : settings["active-settings"];
                filters = filters["active-filters"] == null ? allFilters : filters["active-filters"];

                getCandidateMatches(entities, filters, settings.highlight.highlightRelevanceScore.value).then((words) => {
                    reply(words);
                }).catch((response) => {
                    reply(["QUERY-ERROR", response]);
                });
            });
        })
    }).catch((response) => {
        reply(["NER-ERROR", response]);
    });
}

/**
 * Gets a list of relationships for a given entity
 * @param {*} request the incoming request from the message listener
 * @param {*} reply the reply callback for the message
 * @return An array of objects that contain triple information
 */
function getEntityInfo(request, reply) {
    let query1 = JSON.stringify({ URI: request.uri });
    let query2 = JSON.stringify({ URIs: [request.uri], excludeEvents: true });

    fetch(aggregationURL + encodeURIComponent(query1)).then((response1) => {
        if (response1.status == 200) {
            return response1.json();
        }
        throw new Error("FAILURE");
    }).then((response1) => {
        fetch(entityInfoURL + encodeURIComponent(query2)).then((response2) => {
            if (response2.status == 200) {
                return response2.json();
            }
            throw new Error("FAILURE");
        }).then((response2) => {
            reply([response1, response2]);
        }).catch(() => {
            reply([]);
        });
    }).catch(() => {
        reply([]);
    });
}

/**
 * Gets a list of relationships between two entities
 * @param {*} request the incoming request from the message listener
 * @param {*} reply the reply callback for the message
 * @return An array of objects that contain triple information
 */
 function getRelatedEntities(request, reply) {
    let query = JSON.stringify({
        firstURI: request.firstURI,
        secondURI: request.secondURI,
    });

    fetch(doubleAggregationURL + encodeURIComponent(query)).then((response) => {
        if (response.status == 200) {
            return response.json();
        }
        throw new Error("FAILURE");
    }).then((response) => {
        reply(response);
    }).catch(() => {
        reply([]);
    });
}

/**
 * Gets all possible filters and active filters for the popup selection
 * @param {*} reply the reply callback for the message
 * @return An object containing possible filters and active filters
 */
function getFilters(reply) {
    chrome.storage.sync.get("active-filters", (filters) => {
        reply({
            allFilters: allFilters,
            activeFilters: filters["active-filters"] == null ? allFilters : filters["active-filters"]
        });
    });
}

/**
 * Sets active filters that have been sent from the popup selection
 * @param {*} request the incoming request from the message listener
 * @param {*} reply the reply callback for the message
 * @return A success acknowledgement
 */
function setFilters(request, reply) {
    chrome.storage.sync.set({ "active-filters": request.filters }, () => {
        reply({ type: "success" });
    });
}

/**
 * Gets all possible values for the settings selection
 * @param {*} reply the reply callback for the message
 * @return An object containing possible values for settings
 */
function getSettings(reply) {
    chrome.storage.sync.get("active-settings", (settings) => {
        reply({
            allSettings: allSettings,
            activeSettings: settings["active-settings"] == null ? allSettings : settings["active-settings"]
        });
    });
}

/**
 * Sets active filters that have been sent from the settings selection
 * @param {*} request the incoming request from the message listener
 * @param {*} reply the reply callback for the message
 * @return A success acknowledgement
 */
function setSettings(request, reply) {
    chrome.storage.sync.set({ "active-settings": request.settings }, () => {
        reply({ type: "success" });
    });
}

/* Helper functions for message callbacks */

/**
 * Takes the text from startScan() and runs NER lookup using spaCy
 * @param {*} text the text from startScan()
 * @return An array of NER entities that the NER lookup has found
 */
function nerLookup(text) {
    return new Promise((resolve, reject) => {
        fetch(spaCyURL, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify({
                values: [
                    {
                        recordId: "browser-plugin-lookup",
                        data: {
                            text: text,
                            language: language
                        }
                    }
                ]
            })
        }).then((response) => {
            if (response.status == 200) {
                return response.json();
            } else {
                reject({
                    status: response.status,
                    statusText: response.statusText
                });
            }
        }).then((response) => {
            if (response != null) {
                resolve(response.values[0].data.entities);
            }
        });
    });
}

/**
 * Takes the array of words/phrases from nerLookup and gets candidate entity matches
 * @param {*} entities the array of NER entities from nerLookup()
 * @return An array of words/phrases that have been matched to entities in the triplestore
 */
function getCandidateMatches(entities, filters, relevancyScore) {
    let promises = [];
    for (let i = 0; i < entities.length; i += queryChunkSize) {
        const chunk = entities.slice(i, i + queryChunkSize);

        let properties = [];
        for (let graph of filters.graph) {
            properties.push({
                pid: "http://graph.lincsproject.ca/",
                v: graph
            });
        }

        let query = {};
        let count = 1;
        for (let entity of chunk) {
            if (filters.ner.includes(entity.label)) {
                query['q' + count] = {
                    query: entity.name
                        .replaceAll("/", "//")
                        .replace(/([\\])/g, '\\\\$1')
                        .replace(/[:"'\[\]\(\)\^\n]/g, ' ')
                        .trim(),
                    types: filters.type,
                    limit: 1,
                    properties: properties
                }
                count += 1;
            }
        }

        promises.push(new Promise((resolve) => {
            fetch(reconciliationURL, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: [
                    "queries=" + encodeURIComponent(JSON.stringify(query))
                ]
            }).then((response) => {
                if (response.status == 200) {
                    return response.json();
                } else {
                    resolve({
                        status: response.status,
                        statusText: response.statusText
                    });
                }
            }).then((response) => {
                resolve([query, response]);
            }).catch(() => {
                resolve([
                    query,
                    { status: "PARSE-FAILURE" }
                ]);
            });
        }));
    }

    return new Promise((resolve) => {
        Promise.all(promises).then((responses) => {
            let foundEntities = [];
            for (let response of responses) {
                if (response[1].status == null) {
                    for (let i = 1; i <= queryChunkSize; i++) {
                        if (response[0]['q' + i] == null) {
                            break;
                        } else if (response[1]['q' + i].result[0] != null && response[1]['q' + i].result[0].score > relevancyScore) {
                            foundEntities.push(response[0]['q' + i].query);
                        }
                    }
                }
            }

            foundEntities.sort(function (a, b) {
                return b.length - a.length;
            });

            resolve(foundEntities);
        });
    });
}