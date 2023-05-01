import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import EntitySelectView from "../views/EntitySelectView.vue";
import EntityInfoView from "../views/EntityInfoView.vue";

const routes: Array<RouteRecordRaw> = [
    {
        path: "/entity-select/:numHighlights/:percentComplete/:text?",
        name: "EntitySelect",
        component: EntitySelectView,
    },
    {
        path: "/entity-info/:uri",
        name: "EntityInfo",
        component: EntityInfoView,
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;
