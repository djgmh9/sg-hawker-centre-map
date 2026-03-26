import test from "node:test";
import assert from "node:assert/strict";

import { HAWKER_ACTION_TYPES, reduceHawkerState } from "../src/state/store.js";

function createCentre(id, overrides = {}) {
  return {
    id,
    location: { lat: 1.3, lng: 103.8 },
    properties: {
      NAME: `Hawker ${id}`,
      ADDRESSPOSTALCODE: "123456",
      ADDRESSBUILDINGNAME: "Building",
      ADDRESSSTREETNAME: "Street",
      ADDRESS_MYENV: "Blk 1, Street, Singapore 123456",
      STATUS: "Existing",
      ...overrides,
    },
  };
}

function baseState() {
  return {
    masterList: [],
    filteredList: [],
    searchText: "",
    geoScopeIndex: null,
    activeGeoScope: null,
    residualKeyword: "",
    selectedFeatureId: null,
  };
}

test("status search matches under construction", () => {
  const withList = reduceHawkerState(baseState(), {
    type: HAWKER_ACTION_TYPES.SET_MASTER_LIST,
    payload: {
      list: [
        createCentre("existing-1", { STATUS: "Existing" }),
        createCentre("uc-1", { STATUS: "Under Construction" }),
      ],
    },
  });

  const filtered = reduceHawkerState(withList, {
    type: HAWKER_ACTION_TYPES.APPLY_FILTER,
    payload: { text: "under construction" },
  });

  assert.equal(filtered.filteredList.length, 1);
  assert.equal(filtered.filteredList[0].id, "uc-1");
});

test("selection is cleared when filtered result no longer contains selected feature", () => {
  const withList = reduceHawkerState(baseState(), {
    type: HAWKER_ACTION_TYPES.SET_MASTER_LIST,
    payload: {
      list: [
        createCentre("existing-1", { STATUS: "Existing" }),
        createCentre("new-1", { STATUS: "Existing (new)" }),
      ],
    },
  });

  const selected = reduceHawkerState(withList, {
    type: HAWKER_ACTION_TYPES.SELECT_FEATURE,
    payload: { featureId: "existing-1" },
  });

  assert.equal(selected.selectedFeatureId, "existing-1");

  const filtered = reduceHawkerState(selected, {
    type: HAWKER_ACTION_TYPES.APPLY_FILTER,
    payload: { text: "existing (new)" },
  });

  assert.equal(filtered.filteredList.length, 1);
  assert.equal(filtered.filteredList[0].id, "new-1");
  assert.equal(filtered.selectedFeatureId, null);
});
