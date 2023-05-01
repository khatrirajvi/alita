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
    <div class="loader-block-info" v-show="loading">
        <div class="spinner" id="loading-bar-spinner">
            <div class="spinner-icon"></div>
        </div>
    </div>
    <div class="site-section" v-show="siteSection">
        <div class="header-btn-block" v-on:click="displayEntitySelect">
            <a href="javascript:void(0)" class="back-btn">
                <img src="@/assets/arrow-left.svg" alt="Back Button" />
                Back to results
            </a>
        </div>
        <div class="profile-section">
            <div
                class="first-div"
                v-show="firstChildEntity"
                v-for="(entity, index) in allEntitiesArr"
                :key="index"
            >
                <div class="site-title-text sub-title first">
                    <div class="stitle-text">
                        <div class="stitle-text profile-avtar">
                            <div class="avtar-img">
                                <img
                                    class="img-fluid"
                                    src="https://img.freepik.com/premium-vector/face-cute-girl-avatar-young-girl-portrait-vector-flat-illustration_192760-82.jpg?w=2000"
                                />
                            </div>
                            <div class="profile-details">
                                <span class="first">Subject</span>
                                <h3 class="first">{{ entity.name }}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="icon-btn-group">
                        <span
                            class="panel-button icon-btn border-btn"
                            v-on:click="showDetails = !showDetails"
                            ><img
                                class="img-fluid large-icon"
                                src="@/assets/panel-icon.svg"
                        /></span>
                    </div>
                </div>
                <div class="profile-details" v-show="showDetails">
                    <div
                        class="low-tone"
                        v-for="(entity, eventIndex) in entities"
                        :key="eventIndex"
                    >
                        <div
                            class="pro-details-box"
                            v-if="entity.predicateLabel == 'type'"
                        >
                            <label>Type</label>
                            <p class="truncate-text">
                                {{
                                    entity.objectLabel
                                        ? entity.objectLabel
                                        : entity.object
                                }}
                            </p>
                        </div>
                    </div>
                    <div
                        class="high-tone"
                        v-for="(entity, eventIndex) in dataProperties"
                        :key="eventIndex"
                    >
                        <div
                            class="pro-details-box"
                            v-if="entity.predicateLabel == 'Graph'"
                        >
                            <label>Dataset</label>
                            <p class="truncate-text">
                                {{
                                    entity.objectLabel
                                        ? entity.objectLabel
                                        : entity.object
                                }}
                            </p>
                        </div>
                    </div>
                    <div class="low-tone">
                        <div class="pro-details-box">
                            <label>URI</label>
                            <a
                                class="url-link"
                                :href="
                                    'https://rs-review.lincsproject.ca/resource/?uri=' +
                                    uriList[0]
                                "
                                target="_blank"
                                >{{ uriList[0]
                                }}<img
                                    class="img-fluid external-link"
                                    src="@/assets/external-link.svg"
                            /></a>
                        </div>
                    </div>
                    <div class="high-tone">
                        <div
                            class="pro-details-box"
                            v-on:click="
                                viewMore = !viewMore;
                                siteSection = false;
                            "
                        >
                            <span class="url-link">View More</span>
                        </div>
                    </div>
                </div>
                <div v-show="entity.children.length > 0">
                    <div
                        class="site-title-text sub-title"
                        v-for="(child, index) in entity.children"
                        :key="index"
                    >
                        <img
                            class="img-fluid large-icon"
                            src="@/assets/enter-icon.svg"
                        />
                        <div class="stitle-text profile-avtar">
                            <div class="avtar-img">
                                <img
                                    class="img-fluid"
                                    src="https://img.freepik.com/premium-vector/face-cute-girl-avatar-young-girl-portrait-vector-flat-illustration_192760-82.jpg?w=2000"
                                />
                            </div>
                            <div class="profile-details">
                                <span>Subject</span>
                                <h3 class="truncate-text">
                                    {{ child.name }}
                                </h3>
                            </div>
                        </div>
                        <div class="icon-btn-group">
                            <a
                                class="return-previous-entity"
                                href="javascript:void(0)"
                                v-on:click="
                                    returnToPreviousEntityOnReturn(index)
                                "
                                >Return</a
                            >
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="entity-detail-section" v-show="connectedEntities">
            <div class="entity-title sub-titles">
                <h3>Connected Entities</h3>
            </div>

            <div
                class="entity-details-wrapper"
                v-for="(entity, index) in events"
                :key="index"
            >
                <div class="entity-url-btn profile-section-collapse">
                    <div class="entity-texts-box">
                        <h4 class="entity-label truncate-text">
                            {{ entity.eventLabel }}
                        </h4>
                        <a
                            class="url-text truncate-text"
                            :href="
                                'https://rs-review.lincsproject.ca/resource/?uri=' +
                                entity.event
                            "
                            >{{ entity.event }}</a
                        >
                        <div
                            v-for="(entities, index) in entity.entities"
                            :key="index"
                        >
                            <div
                                class="entity-type-box"
                                v-if="entities.predicateLabel == 'type'"
                            >
                                <h5 class="entity-type-text">
                                    {{
                                        entities.objectLabel
                                            ? entities.objectLabel
                                            : entities.object
                                    }}
                                </h5>
                            </div>
                        </div>
                    </div>
                    <div class="entity-btns-box">
                        <a
                            class="icon-btn white-bg"
                            v-on:click="expandConnectedEntities(index)"
                        >
                            <img
                                class="large-icon"
                                src="@/assets/document-color-icon.svg"
                            />
                        </a>
                    </div>
                </div>

                <div
                    :class="{ active: expandedEntity == index }"
                    class="profile-section light-bg profile-section-collapse display"
                >
                    <div class="profile-details profile-properties">
                        <div
                            class="low-tone"
                            v-for="(entities, index) in entity.entities"
                            :key="index"
                        >
                            <div class="pro-details-box">
                                <label>{{
                                    entities.predicateLabel
                                        ? entities.predicateLabel
                                        : entities.predicate
                                }}</label>
                                <p class="truncate-text">
                                    {{
                                        entities.objectLabel
                                            ? entities.objectLabel
                                            : entities.object
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="site-section" v-show="viewMore">
        <div
            class="header-btn-block"
            v-on:click="
                viewMore = !viewMore;
                siteSection = true;
            "
        >
            <a href="javascript:void(0)" class="back-btn">
                <img src="@/assets/arrow-left.svg" alt="Back Button" />
                Back
            </a>
        </div>
        <div class="entity-details">
            <div class="entity-main-img">
                <img
                    class="img-fluid"
                    src="https://www.slntechnologies.com/wp-content/uploads/2017/08/ef3-placeholder-image.jpg"
                />
            </div>
            <div class="entity-main-title">
                <h3>{{ entityName }}</h3>
            </div>
            <a
                class="external-btn-links space-bottom"
                :href="
                    'https://rs-review.lincsproject.ca/resource/?uri=' +
                    uriList[0]
                "
                target="_blank"
                >View resource on ResearchSpace
                <img class="img-fluid" src="@/assets/external-link-line.svg"
            /></a>
            <a
                class="external-btn-links space-bottom"
                href="javascript: void(0)"
                >View source
                <img class="img-fluid" src="@/assets/external-link-line.svg"
            /></a>
        </div>
        <div class="search-info-section">
            <div
                class="details-box"
                v-for="(entity, eventIndex) in entities"
                :key="eventIndex"
            >
                <h4 class="info-title capitalize">
                    {{
                        entity.predicateLabel == null
                            ? entity.predicate
                            : entity.predicateLabel
                    }}
                </h4>
                <p class="capitalize">
                    {{
                        entity.objectLabel == null
                            ? entity.object
                            : entity.objectLabel
                    }}
                </p>
            </div>
            <div v-for="(event, eventIndex) in events" :key="eventIndex">
                <div
                    class="details-box"
                    v-for="(entity, index) in event.entities"
                    :key="index"
                >
                    <p class="capitalize">
                        {{
                            entity.predicateLabel == null
                                ? entity.predicate
                                : entity.predicateLabel
                        }}
                    </p>
                    <a
                        v-if="entity.objectIsURI"
                        :href="
                            'https://rs-review.lincsproject.ca/resource/?uri=' +
                            entity.object
                        "
                        target="_blank"
                        >{{
                            entity.objectLabel == null
                                ? entity.object
                                : entity.objectLabel
                        }}</a
                    >
                </div>
                <div
                    class="details-box1"
                    v-for="(entity, index) in event.dataProperties"
                    :key="index"
                >
                    <p class="capitalize">
                        {{
                            entity.predicateLabel == null
                                ? entity.predicate
                                : entity.predicateLabel
                        }}
                    </p>
                    <a
                        v-if="entity.objectIsURI"
                        :href="
                            'https://rs-review.lincsproject.ca/resource/?uri=' +
                            entity.object
                        "
                        target="_blank"
                        >{{
                            entity.objectLabel == null
                                ? entity.object
                                : entity.objectLabel
                        }}</a
                    >
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Options } from "vue-class-component";

interface ContentAPI {
    graph: string;
    predicate: string;
    predicateLabel: string;
    object: string;
    objectLabel: string;
    objectIsURI: boolean;
}

interface EventContentAPI {
    event: string;
    eventLabel?: string;
    entities: Array<ContentAPI>;
    dataProperties: Array<ContentAPI>;
}

@Options({
    watch: {
        $route() {
            this.uriList = JSON.parse(this.$route.params.uri as string);
            this.entityName = this.uriList[0];
            this.entities = [];
            this.events = [];
            this.loading = true;
        },
    },
})
export default class EntityInfoView extends Vue {
    entityName = "";
    entities: Array<ContentAPI> = [];
    events: Array<EventContentAPI> = [];
    dataProperties: Array<ContentAPI> = [];
    uriList: Array<string> = [];
    loading = true;
    connectedEntities = true;
    showEntities = false;
    allEntities: Array<ContentAPI> = [];
    commonType: Array<string> = [];
    showDetails = false;
    addEntities = [];
    viewMore = false;
    siteSection = true;
    firstChildEntity = true;
    dataSet: string[] = [];
    entityType: string[] = [];
    childExpanded = false;
    alternateLabel: string[] = [];
    parentArray: any = [];
    connectEntityInfo = [];
    expandedEntity = 0.1;
    allEntitiesArr: any = [];

    mounted() {
        this.uriList = JSON.parse(this.$route.params.uri as string);
        this.entityName = this.uriList[0];

        window.addEventListener("message", (event) => {
            if (
                this.allEntitiesArr.length > 0 &&
                event.data.type == "send-entity-info"
            ) {
                this.getEntityInfo(event.data.response);
                const result = event.data?.response[1][0]?.triples.find(
                    (element: any) => element.predicateLabel === "label"
                );
                if (result.object != this.allEntitiesArr[0].name) {
                    if (result) {
                        this.allEntitiesArr[0].children.push({
                            name: result.object,
                            data: result,
                            children: [],
                        });
                    }
                }
            } else {
                if (event.data.type == "send-entity-info") {
                    this.getEntityInfo(event.data.response);
                    const result = event.data?.response[1][0]?.triples.find(
                        (element: any) => element.predicateLabel === "label"
                    );
                    if (result) {
                        this.allEntitiesArr.push({
                            name: this.entityName,
                            data: result,
                            children: [],
                        });
                    }
                } else if (event.data.type == "send-related-entities") {
                    this.entityName = event.data.entityName;
                    this.getRelatedEntities(event.data.response);
                    let duplArr = JSON.parse(
                        JSON.stringify(this.allEntitiesArr)
                    );
                    const data = this.searchEmptyChildren(duplArr);
                    let singleEntityName = this.allEntitiesArr[0].name;
                    let result = singleEntityName.includes(this.entityName);
                    if (result != true) {
                        if (data) {
                            data.children = [
                                {
                                    parentId: data.id,
                                    name: this.entityName,
                                    children: [],
                                },
                            ];
                            this.allEntitiesArr = duplArr;
                        }
                    }
                }
            }
        });
    }

    // eslint-disable-next-line
    getEntityInfo(response: any) {
        this.loading = false;
        if (response.length != 0) {
            for (let triple of response[1][0].triples) {
                if (triple.predicateLabel == "label") {
                    this.entityName = triple.object;
                } else if (triple.objectIsURI) {
                    this.entities.push(triple);
                } else {
                    this.dataProperties.push(triple);
                }
            }
            if (this.entities.length != 0) {
                this.dataProperties.unshift({
                    graph: this.entities[0].graph,
                    predicate: "http://graph.lincsproject.ca",
                    predicateLabel: "Graph",
                    object: this.entities[0].graph,
                    objectLabel: this.entities[0].graph,
                    objectIsURI: false,
                });
            }
            for (let entity of response[0]) {
                let storedEntity: EventContentAPI = {
                    event: entity.entity,
                    eventLabel: entity.entityLabel,
                    entities: [],
                    dataProperties: [],
                };
                for (let event of entity.events) {
                    storedEntity.entities.push({
                        graph: event.graph,
                        predicate: event.type,
                        predicateLabel: event.typeLabel,
                        object: event.event,
                        objectLabel: event.eventLabel,
                        objectIsURI: true,
                    });
                }
                this.events.push(storedEntity);
            }
        }
    }

    // eslint-disable-next-line
    getRelatedEntities(response: any) {
        this.loading = false;
        if (response.length != 0) {
            for (let entity of response) {
                let isAnnotation = false; // Prevent annotations from displaying
                let storedEntity: EventContentAPI = {
                    event: entity.resource,
                    eventLabel: entity.resource,
                    entities: [],
                    dataProperties: [],
                };

                for (let triple of entity.triples) {
                    if (triple.predicateLabel == "label") {
                        storedEntity.eventLabel = triple.object;
                    } else if (
                        triple.object == "http://www.w3.org/ns/oa#Annotation"
                    ) {
                        isAnnotation = true;
                    } else if (triple.objectIsURI) {
                        storedEntity.entities.push(triple);
                    } else {
                        storedEntity.dataProperties.push(triple);
                    }
                }

                if (!isAnnotation) {
                    this.events.push(storedEntity);
                }
            }
        }
    }

    searchEmptyChildren(list: any): any {
        const first = list[0];
        return first?.children?.length > 0
            ? this.searchEmptyChildren(first.children)
            : first;
    }

    displayEntitySelect() {
        window.parent.postMessage({ type: "show-entity-select" }, "*");
    }

    returnToPreviousEntity() {
        window.parent.postMessage({ type: "entity-traversal-back" }, "*");
    }

    exitExtension() {
        window.parent.postMessage({ type: "exit" }, "*");
    }

    expandConnectedEntities(index: number) {
        let result = JSON.parse(JSON.stringify(this.events));
        this.connectEntityInfo = result.at(index);
        if (this.expandedEntity == index) {
            this.expandedEntity = 0.1;
        } else {
            this.expandedEntity = index;
        }
    }

    returnToPreviousEntityOnReturn(index: number) {
        let checkLength = this.allEntitiesArr[0].children.length;
        this.allEntitiesArr[0].children.splice(
            index,
            this.allEntitiesArr[0].children.length
        );
        let length = checkLength - index;
        for (let i = 0; i < length; i++) {
            window.parent.postMessage({ type: "entity-traversal-back" }, "*");
        }
    }
}
</script>

<style>
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
}

#exit-button {
    margin: 12px;
    cursor: pointer;
}

.loader-block-info {
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

#entity-wrapper {
    height: calc(100vh - 275px);
    overflow-y: auto;
}

#uri-title {
    width: 340px;
    padding: 5px;
    overflow-wrap: break-word;
}

#entity-info-wrapper {
    overflow-y: auto;
    height: calc(100vh - 332px);
}

.event-title {
    width: 160px;
    overflow-wrap: break-word;
}

.entity-info {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: 5px;
    width: 340px;
    overflow-wrap: break-word;
}

/* Summary Panel Start */

.icon-btn {
    width: 30px;
    height: 30px;
    display: flex;
    background-color: #107386;
    text-align: center;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    transition: 0.3s all ease;
}

.icon-btn.border-btn {
    border: 3px solid #87b9c3;
}

.icon-btn.border-btn img {
    width: 20px;
}

.icon-btn:hover {
    background-color: #0c5e6d;
    transition: 0.3s all ease;
}

.icon-btn img {
    width: 14px;
    background-color: transparent;
}

.icon-btn img.large-icon {
    width: 18px;
}

.large-icon {
    width: 20px;
}

.icon-btn.white-bg {
    background-color: white;
}

.icon-btn.white-bg:hover {
    background-color: #c2dbe0;
}

.icon-btn.white-bg:hover img {
    background-color: transparent;
}

.site-section {
    overflow: auto;
    right: 0px;
    top: 0;
    width: auto;
    height: 98vh;
    background-color: #ffffff;
    border-left: 1px solid #dddddd;
}

.site-title {
    position: relative;
    width: auto;
    min-height: 80px;
    background-color: #083943;
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
}

.site-title.active {
    padding-left: 5px;
}

.site-title.active:before {
    content: "";
    position: absolute;
    width: 5px;
    height: 100%;
    background: #87b9c3;
    left: 0;
    top: 0;
}

.site-title-text {
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 10px;
    padding: 0 10px;
    margin-top: 40px;
}

.profile-avtar .avtar-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.stitle-text {
    position: relative;
    flex: 1;
    display: flex;
}

.stitle-text span {
    font-size: 14px;
    display: block;
    color: #ffffff;
    text-transform: capitalize;
}

.stitle-text h3 {
    font-size: 16px;
    display: inline-block;
    color: #ffffff;
    text-transform: capitalize;
    width: 175px;
    margin: 5px 0 0 0;
}

.icon-btn-group .panel-button {
    margin-left: 10px;
}

.icon-btn-group {
    display: flex;
    align-items: center;
}

.summary-section {
    position: relative;
    width: auto;
    padding: 20px 15px;
    border-bottom: 1px solid #cccccc;
}

.target-btn-icon img {
    width: 22px;
}

.summary-title {
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.01rem;
    margin: 0 0 10px 0;
}

.summary-details {
    position: relative;
    margin: 0 0 0 0;
    font-size: 16px;
    color: #333333;
    line-height: 20px;
}

.link-btn {
    text-decoration: none;
    display: inline-block;
    color: #107386;
}

.url-link {
    color: white;
    display: block;
    text-decoration: none;
    font-size: 14px;
}

.url-link .external-link {
    width: 14px;
    margin-left: 5px;
}

.sub-title {
    width: auto;
    position: relative;
    margin-top: 0px;
    padding: 12px 15px;
    margin-bottom: 0;
    background-color: #e7f1f3;
    overflow: hidden;
}

.sub-title.active {
    padding-left: 15px;
}

.sub-title.active:before {
    content: "";
    position: absolute;
    width: 5px;
    height: 100%;
    background: #107386;
    left: 0;
    top: 0;
}

.sub-title .stitle-text span {
    color: #525455;
    font-weight: 300;
}

.sub-title .stitle-text h3 {
    color: #083943;
}

.high-tone span {
    cursor: pointer;
}
/* Summary Panel End */

/* Profile Details Start */

.profile-section {
    position: relative;
    background-color: #083943;
}

.profile-avtar {
    position: relative;
    display: flex;
    align-items: center;
}

.profile-avtar .avtar-img {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 5px;
}

.profile-details {
    text-align: left;
    position: relative;
}

.low-tone {
    background-color: #0a4652;
}

.pro-details-box {
    padding: 7px 15px 7px;
}

.pro-details-box p {
    margin: 0;
    color: white;
    font-size: 14px;
}

.pro-details-box label {
    color: #d2d2d2;
    font-size: 14px;
    margin-bottom: 3px;
    display: block;
}

.profile-section.light-bg {
    background-color: #e7f1f3;
}

.profile-avtar .avtar-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-section.light-bg .pro-details-box p {
    color: #333333;
    width: 100%;
}

.profile-section.light-bg .low-tone {
    background-color: #c2dbe0;
}

.profile-section.light-bg .pro-details-box label {
    color: #414343;
}

.profile-section.light-bg .url-link {
    color: #107386;
}

.profile-section-collapse.profile-section.light-bg .low-tone {
    background-color: #ffffff;
}

.profile-section-collapse.profile-section.light-bg .low-tone:nth-child(odd) {
    background-color: #e7f1f3;
}

.profile-details.profile-properties {
    width: 100%;
}

/* Profile Details End */

/* Entity Section Start */

.entity-title {
    padding: 25px 20px 20px 15px;
    position: relative;
    border-bottom: 1px solid #f2f2f2;
}

.entity-title h3 {
    font-size: 18px;
    margin: 0 0 0 0;
    font-weight: 500;
    color: #29313a;
}

.entity-title.sub-titles {
    padding: 20px 10px 15px 0px;
}

.entity-btns-section {
    position: relative;
    margin: 0;
    padding: 0;
    width: 100%;
    list-style: none;
}

.entity-btns-section li {
    border-bottom: 1px solid #f2f2f2;
}

.entity-btn {
    padding: 20px 20px 20px 15px;
    font-size: 18px;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #083943;
    transition: 0.3s all ease;
}

.entity-btn.entity-back-btn {
    padding: 10px 5px 20px 5px;
    justify-content: inherit;
}

.entity-back-btn .arrow-left {
    margin-right: 10px;
}

.entity-btn:hover {
    color: #ffffff;
    background-color: #107386;
    transition: 0.3s all ease;
}

.entity-detail-section {
    text-align: left;
    position: relative;
    padding: 10px 15px;
}

.entity-url-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 12px;
    border: 1px solid #cccccc;
    padding: 10px 15px 10px 15px;
    margin-bottom: 10px;
    transition: 0.3s all ease;
    text-decoration: none;
}

.entity-url-btn .plus-icon {
    display: none;
}

.entity-texts-box {
    position: relative;
    width: calc(100% - 35px);
}

.entity-texts-box .entity-label {
    width: 100%;
    padding: 0;
    font-size: 16px;
    font-weight: 500;
    color: #333333;
    margin: 0 0 10px 0;
}

.entity-texts-box .url-text {
    font-size: 14px;
    color: #525455;
    margin: 0;
    font-weight: 500;
    display: inline-block;
    width: 100%;
}

.entity-type-box {
    position: relative;
    display: flex;
    align-items: center;
    margin: 10px 0 0 0;
}

.entity-type-box .entity-type-text {
    color: #525455;
    font-size: 14px;
    font-weight: 500;
    margin: 0 0 0 0;
}

.entity-type-box .dot-icon {
    width: 7px;
    margin: 0 5px;
}

.entity-type-box label {
    color: #244d6f;
    border-radius: 20px;
    border: 1px solid #244d6f;
    padding: 1px 3px;
    display: flex;
    font-size: 14px;
    align-items: center;
}

.entity-type-box label .url-icon {
    width: 15px;
    margin: 0px 0 -2px 2px;
}

.entity-type-box label .url-icon-active {
    display: none;
}

.entity-url-btn:hover,
.entity-url-btn.active {
    background-color: #107386;
    transition: 0.3s all ease;
    border-color: #107386;
}

.entity-url-btn:hover .entity-label,
.entity-url-btn.active .entity-label {
    color: #ffffff;
}

.entity-url-btn:hover .url-text,
.entity-url-btn.active .url-text {
    color: #ffffff;
}

.entity-url-btn:hover .entity-type-box .entity-type-text,
.entity-url-btn.active .entity-type-box .entity-type-text {
    color: #ffffff;
}

.entity-url-btn:hover .entity-type-box label,
.entity-url-btn.active .entity-type-box label {
    color: #ffffff;
    border-color: #ffffff;
}

.entity-url-btn.active .entity-type-box label .url-icon {
    display: none;
}

.entity-url-btn.active .entity-type-box label .url-icon-active {
    display: block;
}

.entity-url-btn:hover .plus-icon,
.entity-url-btn.active .plus-icon {
    display: block;
}

.entity-details {
    position: relative;
    padding: 10px 10px;
}

.entity-main-img {
    position: relative;
    width: auto;
    padding: 30px 30px;
}

.entity-main-img img {
    width: 100%;
}

.entity-main-title {
    position: relative;
    width: auto;
}

.entity-main-title h3 {
    font-size: 20px;
    margin: 0 0 15px 0;
}

.external-btn-links {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #083943;
    height: 35px;
    border-radius: 10px;
    text-decoration: none;
    color: #083943;
    transition: 0.3s all ease;
}

.external-btn-links:hover {
    background-color: #083943;
    transition: 0.3s all ease;
    color: #ffffff;
}

.external-btn-links img {
    margin-left: 5px;
}

.external-btn-links:hover img {
    filter: grayscale(1) invert(1);
}

.space-bottom {
    margin-bottom: 10px;
}

.entity-details-wrapper {
    position: relative;
    border: 1px solid #227386;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 10px;
}

.entity-details-wrapper .entity-url-btn {
    margin-bottom: 0;
    border-radius: 0;
}

.entity-btns-box {
    position: relative;
    display: none;
    align-items: center;
}

.entity-url-btn:hover .entity-btns-box {
    display: flex;
}

.entity-btns-box .icon-btn {
    margin-left: 10px;
}

/* Entity Section End */

/* View More Section Start */

.search-info-section {
    position: relative;
    padding: 20px 15px 0;
    margin: 0 0 20px 0;
}

.info-title {
    font-size: 18px;
    display: block;
    margin: 0 0 15px 0;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: #29313a;
}

.info-details {
    position: relative;
    margin: 0 0 15px 0;
}

.details-box {
    text-align: left;
    position: relative;
    display: block;
    margin: 0 0 20px 0;
}

.info-details label {
    font-size: 16px;
    margin: 0 0 8px 0;
    display: block;
    color: #525455;
    font-weight: 400;
}

.info-details p {
    margin: 0;
    font-size: 18px;
    color: #29313a;
    font-weight: 400;
}

.header-btn-block {
    position: relative;
    margin: 0;
    display: flex;
    align-items: center;
    padding: 10px 15px 10px 15px;
}

.back-btn {
    font-size: 16px;
    text-decoration: none;
    display: flex;
    align-items: center;
    color: #333333;
}

.back-btn img {
    margin-right: 10px;
}

.capitalize {
    text-transform: capitalize;
}

.profile-section .first-div:nth-child(1) {
    display: block;
}

.profile-section .first-div {
    display: none;
}

.return-previous-entity {
    display: none;
    text-decoration: none;
    color: white;
    background-color: #083943;
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 14px;
}

.site-title-text:hover .return-previous-entity {
    display: inline-block;
}

.site-title-text.sub-title.first {
    background: #083943;
}

.first {
    width: auto;
    color: #fff !important;
}

.active {
    display: flex !important;
}

.display {
    display: none;
}

.truncate-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

/* View More Section End */
</style>
