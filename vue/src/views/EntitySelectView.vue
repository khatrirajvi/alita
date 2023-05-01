<template>
    <div id="header">
        <img id="lincs-icon" src="@/assets/lincs-icon.png" />
        <h1 id="header-title">Lincs Browser Plugin</h1>
        <svg height="35" width="35" id="exit-button" v-on:click="exitExtension">
            <g transform="translate(17.5, 17.5)">
                <circle r="15" fill="#107386" style="cursor: pointer"></circle>
                <path
                    d="m 0 0 l 10 10 m -10 0 l 10 -10"
                    transform="translate(-5, -5)"
                    stroke="white"
                    stroke-width="3"
                    style="pointer-events: none"
                ></path>
            </g>
        </svg>
    </div>
    <hr />
    <div
        class="loader-block-select"
        v-show="loading || $route.params.percentComplete != '100'"
    >
        <div class="spinner" id="loading-bar-spinner">
            <div class="spinner-icon"></div>
        </div>
    </div>
    <div v-show="!showResults">
        <div v-show="$route.params.percentComplete != '100'">
            <div class="display-row">
                <div id="progress-bar-background">
                    <div
                        id="progress-bar-foreground"
                        :style="'width:' + $route.params.percentComplete + '%'"
                    >
                        {{ $route.params.percentComplete }}%
                    </div>
                </div>
            </div>
            <div class="display-row">
                <p id="num-highlight-text">
                    {{ $route.params.numHighlights }} Highlights Found
                </p>
                <button id="cancel-button" v-on:click="stopScan">
                    Stop Scan
                </button>
            </div>
        </div>
        <div v-show="$route.params.percentComplete == '100'">
            <div class="display-row-offcenter">
                <p>{{ $route.params.numHighlights }} results found.</p>
            </div>
            <div class="display-row-offcenter">
                <h1 id="title">Hover on a entity to view details.</h1>
            </div>
            <div class="display-row-offcenter">
                <svg
                    class="display-row"
                    style="
                        padding-left: 5px;
                        padding-right: 5px;
                        cursor: pointer;
                        height: 40px;
                    "
                    v-on:click="focusOnPreviousHighlight"
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="10"
                    viewBox="0 0 14 8"
                    fill="none"
                >
                    <path
                        d="M7.00023 2.828L2.05023 7.778L0.63623 6.364L7.00023 0L13.3642 6.364L11.9502 7.778L7.00023 2.828Z"
                        fill="#525455"
                    />
                </svg>
                <svg
                    class="display-row"
                    style="
                        padding-left: 5px;
                        padding-right: 5px;
                        cursor: pointer;
                        height: 40px;
                    "
                    v-on:click="focusOnNextHighlight"
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="10"
                    viewBox="0 0 14 8"
                    fill="none"
                >
                    <path
                        d="M7.00023 5.17205L11.9502 0.222046L13.3642 1.63605L7.00023 8.00005L0.63623 1.63605L2.05023 0.222046L7.00023 5.17205Z"
                        fill="#525455"
                    />
                </svg>
                <p
                    v-show="focusedHighlight > 0"
                    style="
                        padding-left: 5px;
                        user-select: none;
                        margin-top: 11px;
                    "
                >
                    ({{ focusedHighlight }}/{{ $route.params.numHighlights }})
                </p>
            </div>
        </div>
        <hr />
    </div>
    <div v-show="entities.length > 0">
        <div>
            <p id="match-entities">{{ entities.length }} entities matching:</p>
            <h1 id="match-title">"{{ $route.params.text }}"</h1>
        </div>
        <select
            v-model="typeFilter"
            v-on:change="filterByType"
            id="type-filter"
        >
            <option value="all">All Types</option>
            <option
                v-for="(type, index) in allTypes"
                :key="index"
                :value="type"
            >
                {{ type }}
            </option>
        </select>
        <div id="entity-wrapper">
            <div
                class="entity"
                v-for="(entity, index) in displayedEntities"
                :key="index"
                v-on:click="selectEntity(entity['label'], entity['uri'])"
            >
                <h3 class="entity-label">{{ entity["label"] }}</h3>
                <p class="entity-uri">{{ entity["uri"] }}</p>
                <div class="entity-info-block">
                    <span class="entity-type">{{ entity["type"] }}</span>
                    <span>&#183;</span>
                    <div class="entity-links-wrapper">
                        <span class="entity-links">{{ entity["links"] }}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="7"
                            viewBox="0 0 9 5"
                            fill="none"
                        >
                            <path
                                d="M5.81259 1.72918L5.81259 2.35634C5.81261 2.64445 5.74472 2.92975 5.6128 3.19594C5.48088 3.46212 5.28751 3.70399 5.04374 3.90772C4.79997 4.11145 4.51057 4.27305 4.19207 4.3833C3.87357 4.49355 3.5322 4.55029 3.18745 4.55027L2.99998 4.55005C2.30375 4.55005 1.63604 4.31891 1.14373 3.90746C0.651423 3.49602 0.374848 2.93798 0.374848 2.35612C0.374848 1.77425 0.651424 1.21621 1.14373 0.80477C1.63604 0.393327 2.30375 0.162182 2.99998 0.162182L2.99998 0.789336C2.75307 0.788433 2.50837 0.828297 2.27993 0.906642C2.0515 0.984986 1.84383 1.10027 1.66885 1.24587C1.49387 1.39147 1.35502 1.56452 1.26028 1.75508C1.16554 1.94565 1.11677 2.14998 1.11677 2.35634C1.11677 2.5627 1.16554 2.76703 1.26028 2.95759C1.35502 3.14816 1.49387 3.32121 1.66885 3.46681C1.84383 3.61241 2.0515 3.72769 2.27993 3.80603C2.50837 3.88438 2.75306 3.92424 2.99998 3.92334L3.18772 3.92334C3.6849 3.92328 4.1617 3.75819 4.51326 3.46437C4.86482 3.17056 5.06236 2.77208 5.06244 2.35656V1.7294L5.81259 1.72963L5.81259 1.72918ZM6.00006 4.55005L6.00006 3.92334C6.24698 3.92424 6.49168 3.88438 6.72011 3.80603C6.94854 3.72769 7.15621 3.61241 7.33119 3.46681C7.50617 3.32121 7.64502 3.14816 7.73976 2.95759C7.8345 2.76703 7.88327 2.5627 7.88327 2.35634C7.88327 2.14998 7.8345 1.94565 7.73976 1.75508C7.64502 1.56452 7.50617 1.39147 7.33119 1.24587C7.15621 1.10027 6.94854 0.984986 6.72011 0.906641C6.49168 0.828297 6.24698 0.788433 6.00006 0.789336L5.81232 0.789336C5.31514 0.789399 4.83834 0.95449 4.48678 1.2483C4.13522 1.54212 3.93768 1.9406 3.93761 2.35612L3.93761 2.98327L3.18745 2.98305L3.18745 2.35634C3.18744 2.06822 3.25532 1.78292 3.38724 1.51674C3.51916 1.25055 3.71253 1.00869 3.9563 0.804959C4.20007 0.60123 4.48947 0.439627 4.80797 0.329376C5.12648 0.219126 5.46785 0.162388 5.81259 0.162403L6.00006 0.162624C6.69629 0.162624 7.364 0.39377 7.85631 0.805213C8.34862 1.21666 8.62519 1.77469 8.62519 2.35656C8.62519 2.93843 8.34862 3.49646 7.85631 3.90791C7.364 4.31935 6.69629 4.55049 6.00006 4.55049V4.55005Z"
                                fill="#244D6F"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
        <div>
            <hr />
            <h4 id="help-text">Need help?</h4>
            <a
                href="https://portal.lincsproject.ca/docs/tools/browser-plugin"
                target="_blank"
                id="doc-link"
            >
                <h5 id="doc-text">View documentation</h5>
            </a>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";

interface DisplayEntity {
    uri: string;
    label: string;
    type: string;
    links: string;
}

interface FilterObject {
    ner: Array<string>;
    graph: Array<string>;
    type: Array<string>;
}

@Options({
    watch: {
        $route() {
            this.checkParamUpdate();
        },
    },
})
export default class EntitySelectView extends Vue {
    reconciliationURL =
        "https://authority.lincsproject.ca/reconcile/any?queries="; // This is the url for getting a list of candidate matches on a text
    showResults = false;
    entities: Array<DisplayEntity> = [];
    displayedEntities: Array<DisplayEntity> = [];
    loading = false;
    focusedHighlight = 0;
    allTypes: Array<string> = [];
    typeFilter = "all";

    mounted() {
        this.checkParamUpdate();

        window.addEventListener("message", (event) => {
            if (event.data.type == "return-filters") {
                this.getEntities(
                    this.$route.params.text as string,
                    event.data.filters
                );
            }
        });
    }

    checkParamUpdate() {
        if (this.$route.params.text != "") {
            this.showResults = true;
            this.loading = true;
            window.parent.postMessage({ type: "get-filters" }, "*");
        } else {
            this.entities = [];
            this.displayedEntities = [];
            this.allTypes = [];
            this.showResults = false;
        }
    }

    getEntities(text: string, filters: FilterObject) {
        let properties = [];
        for (let graph of filters.graph) {
            properties.push({
                pid: "http://graph.lincsproject.ca/",
                v: graph,
            });
        }

        let query = {
            q1: {
                query: text,
                types: filters.type,
                properties: properties,
            },
        };

        fetch(
            this.reconciliationURL + encodeURIComponent(JSON.stringify(query))
        )
            .then((response) => {
                if (response.status == 200) {
                    return response.json();
                } else {
                    console.log(["QUERY-ERROR", response]);
                }
            })
            .then((response) => {
                this.loading = false;
                this.entities = [];
                this.displayedEntities = [];
                for (let result of response.q1.result) {
                    if (this.entities.length < 15) {
                        this.entities.push({
                            uri: result.id,
                            label: result.name,
                            type: result.type[0].name,
                            links: result.outLinks,
                        });
                        if (!this.allTypes.includes(result.type[0].name)) {
                            this.allTypes.push(result.type[0].name);
                        }
                    }
                }
                this.displayedEntities = this.entities;
            });
    }

    selectEntity(label: string, uri: string) {
        window.parent.postMessage(
            { type: "show-entity-graph", label: label, uri: uri },
            "*"
        );
    }

    exitExtension() {
        window.parent.postMessage({ type: "exit" }, "*");
    }

    stopScan() {
        window.parent.postMessage({ type: "stop-scan" }, "*");
    }

    focusOnNextHighlight() {
        if (this.focusedHighlight != Number(this.$route.params.numHighlights)) {
            this.focusedHighlight += 1;
            window.parent.postMessage(
                {
                    type: "scroll-to-highlight",
                    highlightNum: this.focusedHighlight - 1,
                },
                "*"
            );
        }
    }

    focusOnPreviousHighlight() {
        if (this.focusedHighlight != 1) {
            this.focusedHighlight -= 1;
            window.parent.postMessage(
                {
                    type: "scroll-to-highlight",
                    highlightNum: this.focusedHighlight - 1,
                },
                "*"
            );
        }
    }

    filterByType() {
        if (this.typeFilter == "all") {
            this.displayedEntities = this.entities;
        } else {
            this.displayedEntities = this.entities.filter((value) => {
                if (value.type == this.typeFilter) {
                    return true;
                }
                return false;
            });
        }
    }
}
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap");

hr {
    color: lightgrey;
    width: 100%;
}

#header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
}

#header-title {
    font-size: 22px;
    font-family: "Inter", sans-serif;
}

#exit-button {
    margin: 12px;
    cursor: pointer;
}

.loader-block-select {
    position: fixed;
    top: calc(50vh - 35px);
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 999;
}

#loading-bar-spinner.spinner {
    animation: loading-bar-spinner 1000ms linear infinite;
}

#loading-bar-spinner.spinner .spinner-icon {
    width: 70px;
    height: 70px;
    border: solid 10px transparent;
    border-top-color: #083943 !important;
    border-left-color: #083943 !important;
    border-radius: 50%;
}

@keyframes loading-bar-spinner {
    0% {
        transform: rotate(0deg);
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
        transform: rotate(360deg);
    }
}

#lincs-icon {
    width: 35px;
    cursor: pointer;
    margin: 12px;
    border: 0.5px solid black;
    border-radius: 50%;
}

#progress-bar-background {
    width: 300px;
    background-color: #dbdfe0;
    border-radius: 20px;
    overflow: hidden;
}

#progress-bar-foreground {
    width: 10%;
    height: 30px;
    border-radius: 20px;
    background-color: #083943;
    text-align: center;
    line-height: 30px;
    color: white;
}

#title {
    font-size: 18px;
}

.display-row {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 52px;
}

.display-row-offcenter {
    display: flex;
    height: 40px;
    padding-left: 20px;
}

#cancel-button {
    margin-left: 10px;
    height: 35px;
    background-color: #f8ecec;
    border: 1px solid #b54040;
    color: #b54040;
    border-radius: 20px;
    cursor: pointer;
}

#num-highlight-text {
    margin-right: 10px;
}

#match-entities {
    text-align: left;
    font-size: 14px;
    margin: 20px 0px 10px 10px;
    font-family: "Inter", sans-serif;
}

#match-title {
    text-align: left;
    font-size: 26px;
    margin: 5px 0px 12px 10px;
    font-family: "Inter", sans-serif;
}

#type-filter {
    width: 340px;
    height: 38px;
    border-radius: 10px;
    font-size: 14px;
    padding: 10px;
}

#entity-wrapper {
    height: calc(100vh - 275px);
    overflow-y: auto;
    font-family: "Inter", sans-serif;
}

.entity {
    border: 1px solid black;
    border-radius: 20px;
    margin: 5px;
    cursor: pointer;
    overflow-wrap: break-word;
}

.entity-label {
    text-align: left;
    margin: 0px;
    padding: 12px 0px 5px 15px;
    font-size: 18px;
    text-overflow: ellipsis;
    width: 300px;
    overflow: hidden;
    white-space: nowrap;
    font-family: "Inter", sans-serif;
}

.entity-uri {
    text-align: left;
    margin: 0px;
    padding: 0px 0px 12px 15px;
    font-size: 14px;
    text-overflow: ellipsis;
    width: 300px;
    overflow: hidden;
    white-space: nowrap;
    font-family: "Inter", sans-serif;
}

.entity-info-block {
    display: flex;
    flex-direction: row;
    padding: 0px 0px 10px 15px;
    align-items: center;
}

.entity-type {
    font-size: 14px;
    padding-right: 5px;
    font-family: "Inter", sans-serif;
}

.entity-links-wrapper {
    display: flex;
    flex-direction: row;
    align-items: center;
    border: 1px solid #244d6f;
    padding: 2px;
    border-radius: 30px;
    margin-left: 5px;
}

.entity-links {
    display: block;
    font-size: 14px;
    color: #244d6f;
    margin-right: 2px;
    font-family: "Inter", sans-serif;
}

#help-text {
    margin: 10px;
    margin-bottom: 5px;
    text-align: right;
}

#doc-text {
    margin: 10px;
    margin-top: 5px;
    margin-bottom: 5px;
    text-align: right;
}

#doc-link {
    text-decoration: none;
    color: #083943;
}
</style>
