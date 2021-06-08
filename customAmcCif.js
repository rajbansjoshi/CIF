// Converted from AmcCif.ts to customAmcCif.js using https://typescript-play.js.org/
// Verify ES6 Syntax https://www.piliapp.com/syntax-check/es6/
// Removed dynamicsApi import
// export processMessage - converted to customAmcCif.processMessage
// dynamicsApi.postResponseFromCif - converted to window.AmcDynamicsInteractionsAPIpostResponseFromCif

// NOTE - Customization functions to be written towards end of this file
(function (customAmcCif) {
// Begin - AMC Standard functionality
let globalRecordForClickToDial;
class CRMInfos {
    constructor() {
        this.CRMinfos = [];
    }
    addCRMInfo(entity) {
        this.CRMinfos.push(entity);
    }
    getJson() {
        return JSON.stringify(this.CRMinfos);
    }
}
// Variables needed to be made global when converting from JS to TS
// ie on-premise namespace variable amcCif.sendContactDetailsInfoParameters must become global sendContactDetailsInfoParameters
let sendContactDetailsInfoParameters;
let activityChangeNotifyParameters;
let sendWorkModeInfoParameters;
const expandSoftphoneParameters = [];
const INTERACTION_API = 'interactionApi';
const SET_SOFTPHONE_HEIGHT = 'setSoftphoneHeight';
const SCREEN_POP = 'screenPop';
const GET_USER_INFO = 'getUserInfo';
const RUN_QUERY = 'runQuery';
const RUN_QUERY_SCREENPOP = 'runQueryAndScreenPop';
const CAD_SEARCH = 'cadSearch';
const ON_FOCUS = 'triggerOnFocus';
const ON_TRACE = 'triggerOnTrace';
const SET_LAYOUTS = 'setLayouts';
const CLICK_TO_DIAL = 'registerClickToDial';
const DIRECT_CLICK_TO_DIAL = 'registerDirectClickToDial';
const INITIATE = 'initiate';
const GET_PAGE_INFO = 'getPageInfo';
const SAVE_LOG = 'saveLog';
const TOOLBAR_INIT_COMPLETE = 'ToolbarInitComplete';
const CUSTOM_EVENT = 'CustomEvent';
const SEND_WORKMODE_INFO = 'sendWorkModeInfo';
const SEND_CONTACT_DETAILS_INFO = 'sendContactDetailsInfo';
const ACTIVITY_CHANGE_NOTIFY = 'activityChangeNotify';
const EXPAND_SOFTPHONE = 'expandSoftphone';
const OPEN_ENTITY = 'openEntity';
let dynamicsSessionId = null;
let notifyCount = 0;
// Event Queue
const USDEventqueue = [];
const USDToolbarLoadURLEventqueue = [];
const USDScreenPopMatchEventqueue = [];
const USDScreenPopNoMatchEventqueue = [];
const USDScreenPopMultiMatchEventqueue = [];
const USDWorkModeInfoEventqueue = [];
const USDContactDetailsInfoEventqueue = [];
const USDExpandSoftphoneEventqueue = [];
const USDInitializeSoftphoneEventqueue = [];
const USDMyCallsTodayEventqueue = [];
let USDEventCounter = 0;
let USDDataAvailable = false;
let USDRaiseEventTimer = null;
let USDLastRaiseEventTimeMilli = 0;
const initObjectJson = JSON.stringify(new Object());
let cadString = initObjectJson;
const workModeString = initObjectJson;
const contactDetailsString = initObjectJson;
// Cross domain parameters
///////////////////////////////////////////////////////////////////
const getUserInfoParameters = {};
const setSoftphoneHeightParameters = {};
let screenPopParameters = {};
let triggerWhenOnFocusParameters = {};
let triggerOnTraceParameters = {};
let registerClickToDialCallbackParameters = {};
let registerDirectClickToDialCallbackParameters = {};
let getPageInfoParameters = {};
const screenPopReason = {
    EntityScreenPop: 'Entity Screenpop',
    NoMatch: 'No-Match',
    SingleMatch: 'Single-Match',
    MultiMatch: 'Multi-Match'
};
let currentUserId = '';
// OnFocus and Click to Dial letiables
///////////////////////////////////////////////////////////////////
let existingGuid = '';
let onFocusEntityName = '';
let invalidEntityDetected = false;
let onFocusTimerVariable = null;
let crminfos = new CRMInfos();
// ANI and CAD Search letiables
///////////////////////////////////////////////////////////////////
const mapSearchResults = new Object();
let requestCounter = 0;
let noMatchScreenPopData = '';
// Call Log letiables
///////////////////////////////////////////////////////////////////////
const mapActivityDetails = new Object();
// Layout parameters
///////////////////////////////////////////////////////////////////
let searchLayout = {
    objects: null
};
const searchLayoutList = [];
let clickToDialLayout = {
    Entities: null
};
class CRMInfoItem {
    constructor(Id, type, displayName) {
        this.entity = {};
        this.entity['Id'] = Id;
        this.entity['Type'] = type;
        this.entity['DisplayName'] = displayName;
    }
    setField(key, value) {
        this.entity[key] = value;
    }
    getField(key) {
        return this.entity[key];
    }
}
///////////////////////////////////////////////////////////////////////////////////////////
// MOST LOGIC FOR CLICK-TO-DIAL SEARCH
///////////////////////////////////////////////////////////////////////////////////////////
class ClickToDialContext {
    constructor(guid, entityName) {
        this._privateContext = this;
        this._crmInfos = new CRMInfos();
        this.entityGuid = guid;
        this.entityName = entityName;
        this._relatedToFields = getRelatedToFields(entityName);
        this._queryItems = [];
        this._deferredRelatedResults = [];
    }
    hasRelatedFields() {
        return this._relatedToFields !== '';
    }
    hasDeferredRelatedResults() {
        return this._deferredRelatedResults.length > 0;
    }
    handleSingleSearch() {
        const index = this.addEntryToQuery(this.entityGuid, this.entityName);
    }
    handleMultiSearch() {
        this.addEntryToQuery(this.entityGuid, this.entityName);
        retrieveObject(this.entityGuid, this.entityName, this._relatedToFields, this.relatedFieldsSearchCallBack, errorHandler);
    }
    singleSearchCallBack(ref, object) {
        const rawResult = JSON.parse(JSON.stringify(object));
        try {
            const index = parseInt(ref, 10);
            if (index >= this._queryItems.length) {
                reportTrace('logDebug', 'customAmcCif : singleSearchCallBack out of range index ---');
                return;
            }
            if (index !== 0) {
                reportTrace('logDebug', 'customAmcCif : singleSearchCallBack index must be 0 --- ');
                return;
            }
            const apiFields = this._queryItems[index].list.split(',');
            const guid = rawResult[this._queryItems[index]['entity'].toLowerCase() + 'id'];
            let type = '';
            if (guid) {
                type = this._queryItems[index]['entity'].toLowerCase();
            }
            const infoItem = new CRMInfoItem(guid, type, type);
            for (let i = 0; i < apiFields.length; i++) {
                infoItem.setField(apiFields[i], rawResult[apiFields[i]]);
            }
            this._crmInfos.addCRMInfo(infoItem);
            const result = this._crmInfos.getJson();
            if (this._privateContext.entityGuid === existingGuid) {
                clickToDialCallback(result);
            }
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif : Exception .. singleSearchCallBack message:' + e.message);
        }
    }
    relatedFieldsSearchCallBack(relatedFieldsObject) {
        try {
            const obj = JSON.parse(JSON.stringify(relatedFieldsObject));
            const _relatedToFieldsArray = this._relatedToFields.split(',');
            for (let i = 0; i < _relatedToFieldsArray.length; i++) {
                if (typeof obj[this] !== 'undefined') {
                    if (isDeferredResult(obj[this])) {
                        this.addDeferredRelatedResult(obj[this]);
                    }
                    else {
                        this.addRelatedResult(obj[this]);
                    }
                }
            }
            if (this.hasDeferredRelatedResults()) {
                this.addDeferredResultsToQuery();
            }
            else {
                this.performFinalQuery();
            }
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif : relatedFieldsSearchCallback :: ERROR :- ' + e.message);
        }
    }
    addEntryToQuery(guid, entityName) {
        try {
            const searchList = getSearchList(entityName);
            if (searchList === '') {
                return -1;
            }
            const index = this._queryItems.length;
            this._queryItems[index] = { id: index, entity: entityName, guid: guid, list: searchList };
            return index;
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif > addEntryToQuery :: ERROR :- ' + e.message);
        }
    }
    addRelatedResult(object) {
        const objectguid = object.Id;
        let objectname = object.LogicalName;
        if (objectguid == null || objectname == null) {
            // most probably this will happen when an entity did not have anything available in one
            // of its fields that was configured to search on in either the search or click-to-dial layout
            reportTrace('logDebug', 'customAmcCif > addRelatedResult :- related field object has null info.');
            return;
        }
        objectname = getEntityName(objectname);
        if (objectname === '') {
            reportTrace('logDebug', 'customAmcCif : addRelatedResult .. objectname is empty');
            return;
        }
        this.addEntryToQuery(objectguid, objectname);
    }
    addDeferredRelatedResult(record) {
        const type = getTypeOfRelatedField(record);
        const searchFields = getCommaDelimitedListFromArray(getClickToDialPhoneFields(type));
        if (searchFields !== '') {
            const uri = record.__deferred.uri + '?$select=' + searchFields;
            this._deferredRelatedResults.push({ uri: uri, type: type });
        }
    }
    addDeferredResultsToQuery() {
        this.sequentialSearchOverDeferredResults(0); // initiate deferred result sequential search, starting from first result
    }
    sequentialSearchOverDeferredResults(ref) {
        const cb = function (data, textStatus, jqXHR) {
            try {
                data.d.results.array.forEach(element => {
                    const guid = extractGuid(this);
                    const entityType = extractType(this);
                    this.addEntryToQuery(guid, entityType);
                    this.addEntryToQuery(guid, entityType);
                });
            }
            catch (e) {
                reportTrace('logError', 'customAmcCif > sequentialSearchOverDeferredResults :: ajax success : ERROR :- ' + e);
            }
        };
        try {
            const r = new XMLHttpRequest();
            r.responseType = 'json';
            r.onreadystatechange = function () {
                if (r.readyState === 4 && r.status === 200) {
                    cb(r.responseText); // Another callback here
                }
            };
            r.open('GET', this._deferredRelatedResults[ref].uri);
            r.send();
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif > sequentialSearchOverDeferredResults :: Exception :- ' + e.message);
        }
    }
    performFinalQuery() {
        try {
            if (this._privateContext.entityGuid === existingGuid) {
                if (this._queryItems.length === 1) {
                }
                else if (this._queryItems.length > 1) { }
            }
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif > performFinalQuery :: ERROR :- ' + e);
        }
    }
    sequenceSearchCallBack(ref, object) {
        const rawResult = JSON.parse(JSON.stringify(object));
        let index = -1;
        try {
            index = parseInt(ref, 10);
            if (index >= this._queryItems.length) {
                reportTrace('logDebug', 'customAmcCif:Exception .. sequenceSearchCallBack out of range index');
                return;
            }
            const apiFields = this._queryItems[index].list.split(',');
            const guid = rawResult[this._queryItems[index]['entity'].toLowerCase() + 'id'];
            let type = '';
            if (guid) {
                type = this._queryItems[index]['entity'].toLowerCase();
            }
            const infoItem = new CRMInfoItem(guid, type, type);
            const phoneFieldsForType = getClickToDialPhoneFields(type);
            let hasPhoneFields = false;
            for (let i = 0; i < apiFields.length; i++) {
                infoItem.setField(apiFields[i], rawResult[apiFields[i]]);
                if (!hasPhoneFields && phoneFieldsForType.indexOf(apiFields[i]) > -1 && rawResult[apiFields[i]] != null) {
                    hasPhoneFields = true;
                }
            }
            if (guid === this._privateContext.entityGuid.toLowerCase().replace(/[{}]/g, '') || hasPhoneFields) {
                this._crmInfos.addCRMInfo(infoItem);
            }
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif : Exception .. sequenceSearchCallBack message: ' + e.message);
        }
        finally {
            this.nextSequenceSearch(index);
        }
    }
    sequenceSearchErrorCallback(ref, error) {
        errorHandler(error);
        this.nextSequenceSearch(ref);
    }
    nextSequenceSearch(indexOfLastSearch) {
        try {
            if (this._privateContext.entityGuid === existingGuid) {
                if (indexOfLastSearch < this._queryItems.length - 1) { // Issue next search if applicable
                    const index = indexOfLastSearch + 1;
                }
                else { // Report if end of sequence
                    const result = this._crmInfos.getJson();
                    clickToDialCallback(result);
                }
            }
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif : Exception .. nextSequenceSearch message: ' + e.message);
        }
    }
}
customAmcCif.processMessage = function(message, callback) {
    if (message.type !== INTERACTION_API) {
        reportTrace('logDebug', 'customAmcCif.processMessage unknown message type: ' + message.type);
        return;
    }
    // Invoke the command
    switch (message.method) {
        case GET_USER_INFO:
            getUserInfo(message);
            break;
        case SET_SOFTPHONE_HEIGHT:
            setSoftphoneHeight(message);
            break;
        case SCREEN_POP:
            screenPop(message);
            break;
        case RUN_QUERY:
            runQuery(message);
            break;
        case RUN_QUERY_SCREENPOP:
            runQueryAndScreenPop(message);
            break;
        case CAD_SEARCH:
            cadSearch(message);
            break;
        case ON_FOCUS:
            triggerWhenOnFocus(message);
            break;
        case ON_TRACE:
            enableAmcDynamicsTrace(message);
            break;
        case SET_LAYOUTS:
            setLayouts(message);
            break;
        case CLICK_TO_DIAL:
            registerClickToDialCallback(message);
            break;
        case DIRECT_CLICK_TO_DIAL:
            registerClickToAct();
            registerDirectClickToDialCallback(message);
            break;
        case GET_PAGE_INFO:
            getPageInfo(message);
            break;
        case INITIATE:
            initiate(message);
            break;
        case SAVE_LOG:
            saveLog(message);
            break;
        case TOOLBAR_INIT_COMPLETE:
            toolbarInitComplete(message);
            break;
        case CUSTOM_EVENT:
            handleCustomEvent(message);
            break;
        case SEND_WORKMODE_INFO:
            sendWorkModeInfo(message);
            break;
        case SEND_CONTACT_DETAILS_INFO:
            sendContactDetailsInfo(message);
            break;
        case ACTIVITY_CHANGE_NOTIFY:
            activityChangeNotify(message);
            break;
        case EXPAND_SOFTPHONE:
            expandSoftphone(message);
            break;
        case OPEN_ENTITY:
            openEntity(message);
            break;
        default:
            reportTrace('logDebug', 'postMethod.. unknown method:' + message.method);
            break;
    }
}
function getUserInfo(params) {
    Microsoft.CIFramework.getEnvironment().then(function (res) {
        const pageInfo = JSON.parse(res);
        currentUserId = pageInfo.userId.slice(1, -1);
        retrieveObject(currentUserId, 'systemuser', 'domainname', function (resl) {
            const response = {
                params: params, response: { result: { 'DomainName': resl.domainname } }
            };
            postResponse(response);
        }, function (err) {
            reportTrace('logError', err.message);
        });
    }, function (err) {
        reportTrace('logError', err.message);
    });
}
function getEntityMetadata(entityName, callback) {
    try {
        Microsoft.CIFramework.getEntityMetadata(entityName).then(callback, callback);
    }
    catch (e) {
        reportTrace('logError', 'getEntityMetadata: Exception .. message:' + e.message);
    }
}
function entityMetadataCallback(index, dictObjectMetaData, ref) {
    try {
        if (ref !== undefined) {
            if (ref.message !== undefined) {
                reportTrace('logDebug', 'entityMetadataCallback: Entity Metadata call back response received:- ' + ref.message);
            }
        }
        let objectLength = 0;
        if (searchLayout && searchLayout.objects) {
            objectLength = searchLayout.objects.length;
        }
        try {
            dictObjectMetaData[searchLayout.objects[index].objectName] = JSON.parse(ref).EntitySetName;
        }
        catch (err) {
            reportTrace('logError', 'entityMetadataCallback: Response Exception .. message:' + JSON.stringify(ref));
        }
        index = index + 1;
        if (index === objectLength) {
            localStorage.setItem('DynamicsObjectMetadata', JSON.stringify(dictObjectMetaData));
        }
        else {
            getEntityMetadata(searchLayout.objects[index].objectName, function (index, dictObjectMetaData, ref) {
                entityMetadataCallback(index, dictObjectMetaData, ref);
            }.bind(null, index, dictObjectMetaData));
        }
    }
    catch (e) {
        reportTrace('logError', 'entityMetadataCallback: Exception .. message:' + e.message);
    }
}
function processEntityMetadata() {
    try {
        let objectLength = 0;
        if (searchLayout && searchLayout.objects) {
            objectLength = searchLayout.objects.length;
        }
        if (objectLength > 0) {
            const index = 0;
            const dictObjectMetaData = {};
            getEntityMetadata(searchLayout.objects[index].objectName, function (index, dictObjectMetaData, ref) {
                entityMetadataCallback(index, dictObjectMetaData, ref);
            }.bind(null, index, dictObjectMetaData));
        }
    }
    catch (e) {
        reportTrace('logError', 'processEntityMetadata: Exception .. message:' + e.message);
    }
}
function getPageInfo(params) {
    getPageInfoParameters = params;
    let entityName = '';
    let currentGuid = '';
    try {
        Microsoft.CIFramework.getEnvironment().then(function (res) {
            const pageResult = JSON.parse(res);
            if (pageResult.pagetype === 'entityrecord') {
                entityName = pageResult.etn;
                currentGuid = pageResult.id;
                if (entityName === '' || currentGuid === '') {
                    reportTrace('logDebug', 'Report Trace: getPageInfo.. entityName is empty');
                    if (!invalidEntityDetected) {
                        handleInvalidNavigation();
                    }
                }
                if (isSearchableEntity(entityName)) {
                    invalidEntityDetected = false;
                }
                else {
                    reportTrace('logDebug', 'Report Trace: getPageInfo: entry not searchable Detected');
                    handleInvalidNavigation();
                }
                if (invalidEntityDetected) {
                    getPageInfoCallback('{}');
                }
                else {
                    retrieveOnFocusObject(currentGuid, entityName, 'getPageInfo');
                }
            }
        }, function (err) {
            reportTrace('logError', 'Report Trace: getPageInfo: entity null Detected. Error Message : ' + err.message);
            handleInvalidNavigation();
        });
    }
    catch (e) {
        reportTrace('logError', 'Report Trace: getPageInfo: Exception .. message:');
    }
}
function retrieveOnFocusObject(guid, entityName, method) {
    try {
        for (const objectCounter in searchLayoutList) {
            if (searchLayoutList.hasOwnProperty(objectCounter)) {
                const objectValue = searchLayoutList[objectCounter];
                if (objectValue.objectname.toLowerCase() === entityName.toLowerCase()) {
                    reportTrace('logDebug', 'customAmcCif.retrieveOnFocusObject message: Initiating search against:- '
                        + entityName + ' and ' + guid + ' and ' + method);
                    retrieveObject(guid, objectValue.objectname, objectValue.objectfields, function (operation, ref) { retrieveOnFocusObjectCallback(operation, ref); }.bind(null, method), function (operation, ref) { retrieveOnFocusObjectCallback(operation, ref); }.bind(null, method));
                    break;
                }
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.retrieveOnFocusObject: Exception .. message: ' + e.message);
    }
}
function retrieveOnFocusObjectCallback(operation, ref) {
    try {
        const onFocusCRMInfos = new CRMInfos();
        if (ref.message !== undefined) {
            reportTrace('logDebug', 'retrieveOnFocusObjectCallback: Search response received:- ' + ref.message);
        }
        else {
            const raw = JSON.stringify(ref);
            const rawResult = JSON.parse(raw);
            let guid = '';
            let type = '';
            let fieldCounter;
            let objectFields;
            for (fieldCounter in searchLayoutList) {
                if (searchLayoutList.hasOwnProperty(fieldCounter)) {
                    const fieldValue = searchLayoutList[fieldCounter];
                    type = fieldValue.objectname;
                    guid = rawResult[type + 'id'];
                    if (guid) {
                        objectFields = fieldValue.objectfields.split(',');
                        break;
                    }
                }
            }
            const infoItem = new CRMInfoItem(guid, type, type);
            for (let i = 0; i < objectFields.length; i++) {
                infoItem.setField(objectFields[i], rawResult[objectFields[i]]);
            }
            onFocusCRMInfos.addCRMInfo(infoItem);
        }
        const result = onFocusCRMInfos.getJson();
        if (operation === 'getPageInfo') {
            getPageInfoCallback(result);
        }
        else if (operation === 'onFocus') {
            triggerWhenOnFocusCallback(result);
        }
    }
    catch (e) {
        reportTrace('logError', 'retrieveOnFocusObjectCallback: Exception .. message: ' + e.message);
    }
}
function getPageInfoCallback(result) {
    const response = { params: getPageInfoParameters, response: { result: result } };
    reportTrace('logDebug', 'customAmcCif.getPageInfoCallback is sending: ' + JSON.stringify(response));
    postResponse(response);
}
function triggerWhenOnFocusCallback(result) {
    const response = { params: triggerWhenOnFocusParameters, response: { result: result } };
    reportTrace('logDebug', 'customAmcCif.triggerWhenOnFocusCallback message: ' + JSON.stringify(response));
    postResponse(response);
}
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function setSoftphoneHeight(params) {
    return;
}
function setSoftphoneHeightCallback(result) {
    const response = { params: setSoftphoneHeightParameters, response: { result: result } };
    reportTrace('logDebug', 'customAmcCif.setSoftphoneHeightCallback message: ' + JSON.stringify(response));
    postResponse(response);
}
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function enableAmcDynamicsTrace(params) {
    triggerOnTraceParameters = params;
}
function reportTrace(level, message) {
    if (Object.keys(triggerOnTraceParameters).length > 0) {
        const response = { params: triggerOnTraceParameters, response: { level: level, message: message } };
        postResponse(response);
    }
    else {
        console.log('customAmcCif warning: trace is not enabled');
    }
}
function saveLog(params) {
    if (params.logString !== {}) {
        try {
            const logString = params.logString;
            const logObject = JSON.parse(logString);
            const finalLogObject = new Object();
            const requestCounterLocal = getRequestCounter();
            const activityDetails = {
                params: params
            };
            mapActivityDetails[requestCounterLocal] = activityDetails;
            if (logObject.hasOwnProperty('FromandToId')) {
                mapActivityDetails[requestCounterLocal].fromandToId = logObject['FromandToId'].Id;
                mapActivityDetails[requestCounterLocal].fromandToType = logObject['FromandToId'].LogicalName;
            }
            else {
                mapActivityDetails[requestCounterLocal].fromandToId = currentUserId;
                mapActivityDetails[requestCounterLocal].fromandToType = 'systemuser';
                reportTrace('logDebug', 'customAmcCif.saveLog message: Defaulting Call From/ To to systemuser');
            }
            mapActivityDetails[requestCounterLocal].callDirectionCode = logObject['directioncode'];
            if (logObject.hasOwnProperty('ActivityId')) {
                reportTrace('logDebug', 'customAmcCif.saveLog message: Activity being updated with Activity Id:- '
                    + logObject['ActivityId'] + ' and data:- ' + params.logString);
                mapActivityDetails[requestCounterLocal].activityId = logObject['ActivityId'];
                mapActivityDetails[requestCounterLocal].operation = 'open';
                setRecordStatus('phonecall', mapActivityDetails[requestCounterLocal].activityId, '0', '1', function (requestId, ref) { setRecordStatusCallback(requestId, ref); }.bind(null, requestCounterLocal.toString()), function (requestId, ref) { setRecordStatusCallback(requestId, ref); }.bind(null, requestCounterLocal.toString()));
            }
            else {
                for (const property in logObject) {
                    if (property !== 'FromandToId') {
                        finalLogObject[property] = logObject[property];
                    }
                }
                const activityParties = new Array();
                const participantParty = populateActivityParty(requestCounterLocal.toString(), 'customer');
                const userParty = populateActivityParty(requestCounterLocal.toString(), 'systemuser');
                const participantLogicalName = participantParty.partyid.LogicalName.toLowerCase();
                const strParticipant = 'partyid_' + participantLogicalName + '@odata.bind';
                const participantActivityParty = {};
                participantActivityParty[strParticipant] = '/' + getPluralName(participantLogicalName) + '(' + participantParty.partyid.Id + ')';
                participantActivityParty['participationtypemask'] = participantParty.participationtypemask;
                activityParties[0] = participantActivityParty;
                activityParties[1] = {
                    'partyid_systemuser@odata.bind': '/systemusers(' + userParty.partyid.Id
                        + ')', 'participationtypemask': userParty.participationtypemask
                };
                finalLogObject['phonecall_activity_parties'] = activityParties;
                reportTrace('logDebug', 'customAmcCif.saveLog message: Activity being created with data:- ' + params.logString);
                for (const key in finalLogObject) {
                    if (finalLogObject[key].Id && finalLogObject[key].LogicalName) {
                        finalLogObject[key + '_' + finalLogObject[key].LogicalName + '@odata.bind'] = '/' +
                            getPluralName(finalLogObject[key].LogicalName) + '(' + finalLogObject[key].Id + ')';
                        delete finalLogObject[key];
                    }
                }
                Microsoft.CIFramework.createRecord('phonecall', JSON.stringify(finalLogObject))
                    .then(function (requestId, party, ref) { callActivityCallback(requestId, party, JSON.parse(ref)); }
                    .bind(null, requestCounterLocal.toString(), 'systemuser'), function (requestId, party, ref) { callActivityCallback(requestId, party, JSON.parse(ref)); }
                    .bind(null, requestCounterLocal.toString(), 'systemuser'));
            }
        }
        catch (e) {
            reportTrace('logError', 'customAmcCif.saveLog: Exception .. message:' + e.message);
            saveLogCallback('error:' + e.message, params);
        }
    }
}
function getPluralName(logicalName) {
    try {
        const dictObjectMetadata = localStorage.getItem('DynamicsObjectMetadata');
        if (dictObjectMetadata && JSON.parse(dictObjectMetadata)[logicalName]) {
            return JSON.parse(dictObjectMetadata)[logicalName];
        }
    }
    catch (e) {
        reportTrace('logError', 'getPluralName: Exception .. message:' + e.message);
    }
    return logicalName + 's';
}
function callActivityCallback(requestId, party, ref) {
    try {
        if (ref.message !== undefined) {
            reportTrace('logDebug', 'customAmcCif.callActivityCallback message: Create Call activity parties response received:- ' + ref.message);
        }
        if (ref) {
            if (party === 'systemuser') {
                reportTrace('logDebug', 'customAmcCif.callActivityCallback: Closing the activity now with Activity id:- ' + ref.id);
                mapActivityDetails[requestId].activityId = ref.id;
                mapActivityDetails[requestId].operation = 'close';
                setRecordStatus('phonecall', mapActivityDetails[requestId].activityId, '1', '2', function (requestId2, ref2) { setRecordStatusCallback(requestId2, ref2); }.bind(null, requestId), function (requestId2, ref2) { setRecordStatusCallback(requestId2, ref2); }.bind(null, requestId));
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.callActivityCallback: Exception .. message:' + e.message);
        saveLogCallback('error:' + e.message, mapActivityDetails[requestId].params);
    }
}
function populateActivityParty(requestId, party) {
    const activityParty = {};
    if (party === 'customer') {
        activityParty.partyid = {
            Id: mapActivityDetails[requestId].fromandToId,
            LogicalName: mapActivityDetails[requestId].fromandToType
        };
    }
    else if (party === 'systemuser') {
        activityParty.partyid = {
            Id: currentUserId,
            LogicalName: 'systemuser'
        };
    }
    if (party === 'customer') {
        if (mapActivityDetails[requestId].callDirectionCode === false) {
            // Inbound
            activityParty.participationtypemask = 1;
        }
        else {
            // Outbound
            activityParty.participationtypemask = 2;
        }
    }
    else if (party === 'systemuser') {
        if (mapActivityDetails[requestId].callDirectionCode === false) {
            // Inbound
            activityParty.participationtypemask = 2;
        }
        else {
            // Outbound
            activityParty.participationtypemask = 1;
        }
    }
    return activityParty;
}
function setRecordStatus(entitySchemaName, recordGuid, stateCode, statusCode, successCallBack, errorCallBack) {
    try {
        const object = {};
        object['statecode'] = stateCode;
        object['statuscode'] = statusCode;
        Microsoft.CIFramework.updateRecord(entitySchemaName, recordGuid, JSON.stringify(object)).then(successCallBack, errorCallBack);
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.setRecordStatus: Exception .. message:' + e.message);
    }
}
function saveLogCallback(result, params) {
    const check = 'error';
    let response;
    if (result.indexOf(check) > -1) {
        response = { params: params, response: { error: result } };
    }
    else {
        response = { params: params, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.saveLogCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function updateCallActivitiesCallback(requestId, ref) {
    try {
        if (ref !== undefined) {
            if (ref.message !== undefined) {
                reportTrace('logDebug', 'customAmcCif.updateCallActivitiesCallback: Update call activities response received:- ' + ref.message);
            }
        }
        reportTrace('logDebug', 'customAmcCif.updateCallActivitiesCallback: Update received and now closing the Phone call activity with Activity Id:- '
            + mapActivityDetails[requestId].activityId);
        mapActivityDetails[requestId].operation = 'close';
        setRecordStatus('phonecall', mapActivityDetails[requestId].activityId, '1', '2', function (requestId2, ref2) { setRecordStatusCallback(requestId2, ref2); }.bind(null, requestId), function (requestId2, ref2) { setRecordStatusCallback(requestId2, ref2); }.bind(null, requestId));
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.updateCallActivitiesCallback: Exception .. message:' + e.message);
        saveLogCallback('error:' + e.message, mapActivityDetails[requestId].params);
    }
}
function setRecordStatusCallback(requestId, ref) {
    let params;
    try {
        if (ref !== undefined) {
            if (ref.message !== undefined) {
                reportTrace('logDebug', 'customAmcCif.setRecordStatusCallback: Create Call activity parties response received:- ' + ref.message);
            }
        }
        const activityId = mapActivityDetails[requestId].activityId;
        const operation = mapActivityDetails[requestId].operation;
        params = mapActivityDetails[requestId].params;
        if (mapActivityDetails.hasOwnProperty(requestId)) {
            if (mapActivityDetails[requestId].operation === 'close') {
                delete mapActivityDetails[requestId];
            }
        }
        if (operation === 'close') {
            saveLogCallback(activityId, params);
        }
        else if (operation === 'open') {
            reportTrace('logDebug', 'customAmcCif.setRecordStatusCallback: updating activity with activity id:- ' + activityId);
            const logObject = JSON.parse(params.logString);
            const finalLogObject = new Object();
            for (const property in logObject) {
                if (property !== 'ActivityId' && property !== 'FromandToId') {
                    finalLogObject[property] = logObject[property];
                }
            }
            const activityParties = new Array();
            const participantParty = populateActivityParty(requestId.toString(), 'customer');
            const userParty = populateActivityParty(requestId.toString(), 'systemuser');
            const participantLogicalName = participantParty.partyid.LogicalName.toLowerCase();
            const strParticipant = 'partyid_' + participantLogicalName + '@odata.bind';
            const participantActivityParty = {};
            participantActivityParty[strParticipant] = '/' + getPluralName(participantLogicalName) + '(' + participantParty.partyid.Id + ')';
            participantActivityParty['participationtypemask'] = participantParty.participationtypemask;
            activityParties[0] = participantActivityParty;
            activityParties[1] = {
                'partyid_systemuser@odata.bind': '/systemusers(' + userParty.partyid.Id + ')',
                'participationtypemask': userParty.participationtypemask
            };
            finalLogObject['phonecall_activity_parties'] = activityParties;
            reportTrace('logDebug', 'customAmcCif.saveLog message: Activity being created with data:- ' + params.logString);
            for (const key in finalLogObject) {
                if (finalLogObject[key].Id && finalLogObject[key].LogicalName) {
                    finalLogObject[key + '_' + finalLogObject[key].LogicalName + '@odata.bind']
                        = '/' + getPluralName(finalLogObject[key].LogicalName) + '(' + finalLogObject[key].Id + ')';
                    delete finalLogObject[key];
                }
            }
            Microsoft.CIFramework.updateRecord('phonecall', activityId, JSON.stringify(finalLogObject)).then(function (requestId2, ref2) { updateCallActivitiesCallback(requestId2, ref2); }.bind(null, requestId), function (requestId2, ref2) { updateCallActivitiesCallback(requestId2, ref2); }.bind(null, requestId));
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.setRecordStatusCallback: Exception .. message:' + e.message);
        saveLogCallback('error:' + e.message, params);
    }
}
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function screenPop(params) {
    try {
        screenPopParameters = params;
        reportTrace('logDebug', 'screenPop message: Objectid:- ' + params.objectId + ', Object Type :- ' + params.objectType
            + 'CAD String :-' + params.cadString);
        if (params.objectType != null) {
            if (params.objectType === 'url' && (window.IsUSD != null) && (window.IsUSD === true)) {
                const mycallstodayURL = params.cadString;
            }
            else {
                const cadString2 = params.cadString;
                if ((window.IsUSD != null) && (window.IsUSD === true)) {
                    if (cadString2 != null && cadString2 !== '') {
                        const cadObject = JSON.parse(cadString2);
                        cadObject.CallType = 'phonecall';
                        const formattedCADString = JSON.stringify(cadObject);
                        postCADString(formattedCADString, 30000);
                        const screenpopObject = {};
                        screenpopObject.LogicalName = params.objectType.toLowerCase();
                        screenpopObject.Id = params.objectId;
                        screenpopObject.cad = cadObject;
                    }
                    else {
                        const screenpopMatchResponse = { LogicalName: params.objectType.toLowerCase(), Id: params.objectId };
                    }
                }
                else {
                    const crminfos2 = new CRMInfos();
                    const infoItem = new CRMInfoItem(params.objectId, params.objectType.toLowerCase(), params.objectType.toLowerCase());
                    crminfos2.addCRMInfo(infoItem);
                    const result = crminfos2.getJson();
                    openEntity(params);
                }
            }
            screenPopCallback('success');
        }
        else {
            reportTrace('logDebug', 'customAmcCif.screenPop ... params.objectType is null');
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.screenPop: Exception .. message:' + e.message);
        screenPopCallback('error:' + e.message);
    }
}
let postCADStringTimeout = null;
function postCADString(cadValue, timeout) {
    try {
        cadString = cadValue;
        if (postCADStringTimeout != null) {
            try {
                clearTimeout(postCADStringTimeout);
            }
            catch (err) {
                reportTrace('logError', err.message);
            }
            postCADStringTimeout = null;
        }
        postCADStringTimeout = setTimeout(function () { cadString = initObjectJson; }, timeout);
    }
    catch (e) {
        reportTrace('logError', 'postResponse exception, e.message=' + e.message);
    }
}
function openEntity(params) {
    try {
        reportTrace('logDebug', 'customAmcCif.openEntity message: Entity Type :- ' + params.entityType + 'Entity Info :-' + JSON.stringify(params));
        params.entityType = (params.entityType) ? params.entityType : params.objectType;
        if (params.entityType != null) {
            if (!(window.IsUSD != null && window.IsUSD === true)) {
                const entityParams = {};
                for (const info in params.formFields) {
                    if (params.formFields.hasOwnProperty(info)) {
                        entityParams[info] = params.formFields[info];
                    }
                }
                let entityDetails = {};
                if (params.entityInfo) {
                    entityDetails = JSON.parse(params.entityInfo);
                }
                for (const info in entityDetails) {
                    if (entityDetails.hasOwnProperty(info)) {
                        entityParams[info] = entityDetails[info];
                    }
                }
                const entityFormOptions = {};
                entityFormOptions['entityName'] = params.entityType;
                entityFormOptions['entityId'] = params.objectId ? params.objectId : '';
                Microsoft.CIFramework.openForm(JSON.stringify(entityFormOptions), JSON.stringify(entityParams)).then(function (success) {
                    openEntityCallback('success', params);
                }, function (error) {
                    openEntityCallback('error:' + error.message, params);
                });
            }
        }
        else {
            reportTrace('logDebug', 'customAmcCif.openEntity ... params.entityType is null');
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.openEntity: Exception .. message:' + e.message);
        openEntityCallback('error:' + e.message, params);
    }
}
function openEntityCallback(result, params) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: params, response: { error: result } };
    }
    else {
        response = { params: params, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.openEntityCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function sendWorkModeInfo(params) {
    try {
        sendWorkModeInfoParameters = params;
        reportTrace('logDebug', 'customAmcCif.sendWorkModeInfo message: workmodeDetails:- ' + params.workmodeDetails);
        if (params.workmodeDetails != null) {
            if ((window.IsUSD != null) && (window.IsUSD === true)) {
            }
            sendWorkModeInfoCallback('success');
        }
        else {
            reportTrace('logDebug', 'customAmcCif.SendWorkmodeInfo ... params.workmodeDetails is null');
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.sendWorkModeInfo: Exception .. message:' + e.message);
        sendWorkModeInfoCallback('error:' + e.message);
    }
}
function sendWorkModeInfoCallback(result) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: sendWorkModeInfoParameters, response: { error: result } };
    }
    else {
        response = { params: sendWorkModeInfoParameters, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.sendWorkModeInfoCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function activityChangeNotify(params) {
    try {
        activityChangeNotifyParameters = params;
        // To Do any operations required
        // Receives notification on change to Activity Name / Regarding / Subject / Call Notes
        activityChangeNotifyCallback('success');
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.activityChangeNotify: Exception .. message:' + e.message);
        activityChangeNotifyCallback('error:' + e.message);
    }
}
function activityChangeNotifyCallback(result) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: activityChangeNotifyParameters, response: { error: result } };
    }
    else {
        response = { params: activityChangeNotifyParameters, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.activityChangeNotifyCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function sendContactDetailsInfo(params) {
    try {
        sendContactDetailsInfoParameters = params;
        reportTrace('logDebug', 'customAmcCif.sendContactDetailsInfo message: contactDetails:- ' + params.contactDetails);
        if (params.contactDetails != null) {
            if ((window.IsUSD != null) && (window.IsUSD === true)) {
            }
            if (dynamicsSessionId) {
                notifyCount++;
                Microsoft.CIFramework.notifyNewActivity(dynamicsSessionId, notifyCount);
                Microsoft.CIFramework.updateContext(params.contactDetails, dynamicsSessionId);
            }
            sendContactDetailsInfoCallback('success');
        }
        else {
            reportTrace('logDebug', 'customAmcCif.sendContactDetailsInfo ... params.contactDetails is null');
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.sendContactDetailsInfo: Exception .. message:' + e.message);
        sendContactDetailsInfoCallback('error:' + e.message);
    }
}
function sendContactDetailsInfoCallback(result) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: sendContactDetailsInfoParameters, response: { error: result } };
    }
    else {
        response = { params: sendContactDetailsInfoParameters, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.sendContactDetailsInfoCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function expandSoftphone(params) {
    try {
        reportTrace('logDebug', 'customAmcCif.expandSoftphone message: expandSoftphoneMessage:- ' + params.expandSoftphoneMessage);
        if ((window.IsUSD != null) && (window.IsUSD === true)) {
            expandSoftphoneCallback('success');
        }
        else {
            Microsoft.CIFramework.setMode(1).then(function (res) {
                expandSoftphoneCallback('success');
            }, function (err) {
                expandSoftphoneCallback('error:');
            });
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.expandSoftphoneCallback: Exception .. message:' + e.message);
        expandSoftphoneCallback('error:' + e.message);
    }
}
function expandSoftphoneCallback(result) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: expandSoftphoneParameters, response: { error: result } };
    }
    else {
        response = { params: expandSoftphoneParameters, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.expandSoftphoneCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function screenPopCallback(result) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: screenPopParameters, response: { error: result } };
    }
    else {
        response = { params: screenPopParameters, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.screenPopCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function cadSearch(params) {
    try {
        const method = 'cadSearch';
        const searchResults = [];
        const cadString2 = params.cadString;
        reportTrace('logDebug', 'customAmcCif.cadSearch message: ObjectFields:- ' + params.objectFields + ', Object Type :- '
            + params.objectType + ', Filter key:- ' + params.filterKey + ', CAD Value:- ' + params.cadValue);
        const requestCounter2 = getRequestCounter();
        const searchParameterDetails = {
            params: params,
            searchResults: searchResults
        };
        const msCRMObjectType = params.msCRMObjectType.trim().toLowerCase();
        mapSearchResults[requestCounter2] = searchParameterDetails;
        if (msCRMObjectType === 'guid') {
            reportTrace('logDebug', mapSearchResults[requestCounter2].params.filterKey);
            reportTrace('logDebug', mapSearchResults[requestCounter2].params.cadValue);
            const filterGUID = '$filter=' + mapSearchResults[requestCounter2].params.filterKey + ' eq guid\''
                + mapSearchResults[requestCounter2].params.cadValue + '\'';
            reportTrace('logDebug', 'customAmcCif.cadSearch message: Initiating search against:- ' + mapSearchResults[requestCounter2].params.objectType);
            retrieveSearchResults(filterGUID, mapSearchResults[requestCounter2].params.objectType, mapSearchResults[requestCounter2].params.objectFields, function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                .bind(null, '0', method, requestCounter2.toString()), function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                .bind(null, '0', method, requestCounter2.toString()));
        }
        else {
            const filterString = '$filter=' + mapSearchResults[requestCounter2].params.filterKey + ' eq \''
                + mapSearchResults[requestCounter2].params.cadValue + '\'';
            reportTrace('logDebug', 'customAmcCif.cadSearch message: Initiating search against:- ' + mapSearchResults[requestCounter2].params.objectType);
            retrieveSearchResults(filterString, mapSearchResults[requestCounter2].params.objectType, mapSearchResults[requestCounter2].params.objectFields, function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                .bind(null, '0', method, requestCounter2.toString()), function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                .bind(null, '0', method, requestCounter2.toString()));
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.cadSearch: Exception .. message:' + e.message);
        cadSearchCallback('error:' + e.message, params);
    }
}
function cadSearchCallback(result, params) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: params, response: { error: result } };
    }
    else {
        response = { params: params, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.cadSearchCallback message:' + response);
    postResponse(response);
}
///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
function runQuery(params) {
    try {
        const method = 'runQuery';
        const searchResults = [];
        const requestCounter2 = getRequestCounter();
        const searchParameterDetails = {
            params: params,
            searchResults: searchResults
        };
        mapSearchResults[requestCounter2] = searchParameterDetails;
        reportTrace('logDebug', 'customAmcCif.runQuery message: RequestId:- ' + requestCounter2 + ', ANI :- '
            + mapSearchResults[requestCounter2].params.queryString);
        let objectCounter;
        for (objectCounter in searchLayoutList) {
            if (searchLayoutList.hasOwnProperty(objectCounter)) {
                const objectValue = searchLayoutList[objectCounter];
                if (objectValue.id === 0) {
                    const filterString = getFilterSystemQueryOption(objectValue, mapSearchResults[requestCounter2].params.queryString);
                    reportTrace('logDebug', 'customAmcCif.runQuery message: Initiating search against:- ' + objectValue.objectname);
                    retrieveSearchResults(filterString, objectValue.objectname, objectValue.objectfields, function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                        .bind(null, objectValue.id, method, requestCounter2.toString()), function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                        .bind(null, objectValue.id, method, requestCounter2.toString()));
                    break;
                }
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.runQuery: Exception .. message:' + e.message);
        runQueryCallback('error:' + e.message, params);
    }
}
function runQueryAndScreenPop(params) {
    try {
        const method = 'runQueryandScreenPop';
        const searchResults = [];
        const requestCounter2 = getRequestCounter();
        const searchParameterDetails = {
            params: params,
            searchResults: searchResults
        };
        mapSearchResults[requestCounter2] = searchParameterDetails;
        reportTrace('logDebug', 'customAmcCif.runQueryandScreenPop message: RequestId:- ' + requestCounter2 + ', ANI :- '
            + mapSearchResults[requestCounter2].params.queryString);
        let objectCounter;
        for (objectCounter in searchLayoutList) {
            if (searchLayoutList.hasOwnProperty(objectCounter)) {
                const objectValue = searchLayoutList[objectCounter];
                if (objectValue.id === 0) {
                    const filterString = getFilterSystemQueryOption(objectValue, mapSearchResults[requestCounter2].params.queryString);
                    reportTrace('logDebug', 'customAmcCif.runQueryAndScreenPop message: Initiating search against:- ' + objectValue.objectname);
                    retrieveSearchResults(filterString, objectValue.objectname, objectValue.objectfields, function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                        .bind(null, objectValue.id, method, requestCounter2.toString()), function (objectId, operation, requestId, ref) { retrieveSearchResultsCallback(objectId, operation, requestId, ref); }
                        .bind(null, objectValue.id, method, requestCounter2.toString()));
                    break;
                }
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.runQueryAndScreenPop: Exception .. message:' + e.message);
        runQueryAndScreenPopCallback('error:' + e.message, params);
    }
}
function getRequestCounter() {
    if (requestCounter === 10000) {
        requestCounter = 0;
    }
    requestCounter += 1;
    return requestCounter;
}
function getFilterSystemQueryOption(objectValue, queryString) {
    let filterString = '$filter=';
    let filterloop = '';
    try {
        const filterConditions = objectValue.phonefields.split(',');
        if (filterConditions.length > 0) {
            for (filterloop in filterConditions) {
                if (filterConditions.hasOwnProperty(filterloop)) {
                    filterString += filterConditions[filterloop];
                    filterString += ' eq \'';
                    filterString += queryString;
                    filterString += '\' or ';
                }
            }
        }
        filterString = filterString.substring(0, filterString.length - 3);
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.getFilterSystemQueryOption: Exception .. message:' + e.message);
    }
    return filterString;
}
function runQueryAndScreenPopCallback(result, params) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: params, response: { error: result } };
    }
    else {
        response = { params: params, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.runQueryAndScreenPopCallback message:' + JSON.stringify(response));
    postResponse(response);
}
function runQueryCallback(result, params) {
    let response;
    const check = 'error';
    if (result.indexOf(check) > -1) {
        response = { params: params, response: { error: result } };
    }
    else {
        response = { params: params, response: { result: result } };
    }
    reportTrace('logDebug', 'customAmcCif.runQueryCallback message:' + response);
    postResponse(response);
}
function retrieveSearchResults(filterString, objectName, selectString, callback, errorHandler1) {
    try {
        if (selectString) {
            selectString = '?$select=' + selectString;
        }
        if (filterString) {
            if (selectString) {
                filterString = '&' + filterString;
            }
            else {
                filterString = '?' + filterString;
            }
        }
        if (filterString && filterString.indexOf('+') > -1) {
            filterString = filterString.split('+').join('%2B');
        }
        Microsoft.CIFramework.searchAndOpenRecords(objectName, selectString + filterString, true).then(function success(result) {
            const res = JSON.parse(result);
            const searchresults = { results: res };
            callback(searchresults);
        }, function (error) {
            errorHandler1(error);
        });
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif: retrieveSearchResults: Exception .. message:' + e.message);
    }
}
function parseSearchDataintoCRMInfo(resultList) {
    let resultCounter;
    try {
        for (resultCounter in resultList) {
            if (resultList.hasOwnProperty(resultCounter)) {
                const raw = JSON.stringify(resultList[resultCounter]);
                const rawResult = JSON.parse(raw);
                let guid = '';
                let type = '';
                let fieldCounter;
                let objectFields;
                for (fieldCounter in searchLayoutList) {
                    if (searchLayoutList.hasOwnProperty(fieldCounter)) {
                        const fieldValue = searchLayoutList[fieldCounter];
                        type = fieldValue.objectname;
                        guid = rawResult[type + 'id'];
                        if (guid) {
                            objectFields = fieldValue.objectfields.split(',');
                            break;
                        }
                    }
                }
                const infoItem = new CRMInfoItem(guid, type, type);
                const objectFieldCounter = 0;
                for (let i = 0; i < objectFields.length; i++) {
                    infoItem.setField(objectFields[i], rawResult[objectFields[i]]);
                }
                crminfos.addCRMInfo(infoItem);
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : parseSearchDataintoCRMInfo: Exception .. message:' + e.message);
    }
}
function parseSearchDataintoCRMInfoClickToDial(resultList) {
    let resultCounter;
    const myResult = new CRMInfos();
    try {
        for (resultCounter in resultList) {
            if (resultList.hasOwnProperty(resultCounter)) {
                const raw = JSON.stringify(resultList[resultCounter]);
                const rawResult = JSON.parse(raw);
                let guid = '';
                let type = '';
                let fieldCounter;
                let objectFields;
                for (fieldCounter in searchLayoutList) {
                    if (searchLayoutList.hasOwnProperty(fieldCounter)) {
                        const fieldValue = searchLayoutList[fieldCounter];
                        type = fieldValue.objectname;
                        guid = rawResult[type + 'id'];
                        if (guid) {
                            objectFields = fieldValue.objectfields.split(',');
                            break;
                        }
                    }
                }
                const infoItem = new CRMInfoItem(guid, type, type);
                for (let i = 0; i < objectFields.length; i++) {
                    infoItem.setField(objectFields[i], rawResult[objectFields[i]]);
                }
                myResult.addCRMInfo(infoItem);
            }
        }
        return myResult;
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : parseSearchDataintoCRMInfo: Exception .. message:' + e.message);
    }
}
function postFinalSearchResults(resultList, operation, requestId) {
    let result;
    let params;
    crminfos = new CRMInfos();
    try {
        reportTrace('logDebug', 'customAmcCif : postFinalSearchResults: .. message:' + resultList.toString() + operation + requestId);
        if (mapSearchResults.hasOwnProperty(requestId)) {
            params = mapSearchResults[requestId].params;
        }
        if (resultList.length > 0) {
            parseSearchDataintoCRMInfo(resultList);
            if (operation === 'runQueryandScreenPop' && params.callType.toLowerCase() !== 'internal') {
                if (crminfos.CRMinfos.length === 1) {
                    let individualResultCounter;
                    const cadString2 = params.cadString2;
                    for (individualResultCounter in crminfos.CRMinfos) {
                        if (crminfos.CRMinfos.hasOwnProperty(individualResultCounter)) {
                            const individualResult = crminfos.CRMinfos[individualResultCounter];
                            if (individualResult.getField('Type') != null) {
                                if ((window.IsUSD != null) && (window.IsUSD === true)) {
                                    if (cadString2 != null && cadString2 !== '') {
                                        const cadObject = JSON.parse(cadString2);
                                        cadObject.CallType = 'phonecall';
                                        const formattedCADString = JSON.stringify(cadObject);
                                        postCADString(formattedCADString, 30000);
                                        const screenpopObject = {};
                                        screenpopObject.LogicalName = individualResult.getField('Type').toLowerCase();
                                        screenpopObject.Id = individualResult.getField('Id');
                                        screenpopObject.cad = cadObject;
                                    }
                                    else {
                                        const screenpopMatchResponse = {
                                            LogicalName: individualResult.getField('Type').toLowerCase(),
                                            Id: individualResult.getField('Id')
                                        };
                                    }
                                }
                                else {
                                    result = crminfos.getJson();
                                    openEntity({
                                        objectType: individualResult.getField('Type').toLowerCase(),
                                        objectId: individualResult.getField('Id')
                                    });
                                }
                            }
                            else {
                                reportTrace('logDebug', 'customAmcCif : postFinalSearchResults: .. individualResult.getField is null');
                            }
                            break;
                        }
                    }
                }
                else {
                    getPageInfo(getPageInfoParameters);
                    const cadString2 = params.cadString;
                    let cadObject = null;
                    if (cadString2 != null && cadString2 !== '') {
                        cadObject = JSON.parse(cadString2);
                        cadObject.CallType = 'phonecall';
                        const formattedCADString = JSON.stringify(cadObject);
                        postCADString(formattedCADString, 60000);
                    }
                    if ((window.IsUSD != null) && (window.IsUSD === true)) {
                        if (mapSearchResults[requestId].params.queryString !== undefined) {
                            const screenpopMultiMatchResponse = {};
                            screenpopMultiMatchResponse.text = mapSearchResults[requestId].params.queryString;
                            if (cadObject != null) {
                                screenpopMultiMatchResponse.cad = cadObject;
                            }
                            reportTrace('logDebug', 'customAmcCif : postFinalSearchResults: .. json string:' + screenpopMultiMatchResponse.toString());
                        }
                    }
                    else {
                        if (mapSearchResults[requestId].params.queryString !== undefined) {
                            reportTrace('logDebug', 'rendersearch phonenumber: ' + mapSearchResults[requestId].params.queryString);
                            const searchEntityName = 'contact';
                            Microsoft.CIFramework.renderSearchPage(searchEntityName, mapSearchResults[requestId].params.queryString);
                        }
                    }
                }
            }
        }
        else {
            const cadString2 = params.cadString;
            if (operation === 'runQueryandScreenPop' && noMatchScreenPopData !== '' && noMatchScreenPopData != null
                && params.callType.toLowerCase() !== 'internal') {
                if ((window.IsUSD != null) && (window.IsUSD === true)) {
                    const screenpopMultiMatchResponse = {};
                    screenpopMultiMatchResponse.text = mapSearchResults[requestId].params.queryString;
                    if (cadString2 != null && cadString2 !== '') {
                        const cadObject = JSON.parse(cadString2);
                        cadObject.CallType = 'phonecall';
                        const formattedCADString = JSON.stringify(cadObject);
                        postCADString(formattedCADString, 60000);
                        const noMatchscreenpopObject = {};
                        noMatchscreenpopObject.LogicalName = noMatchScreenPopData.toLowerCase();
                        noMatchscreenpopObject.cad = cadObject;
                        screenpopMultiMatchResponse.cad = cadObject;
                        reportTrace('logDebug', 'customAmcCif : postFinalSearchResults: .. json string:' + JSON.stringify(noMatchscreenpopObject));
                    }
                    else {
                        const screenpopNoMatchResponse = { LogicalName: noMatchScreenPopData.toLowerCase() };
                    }
                }
                else {
                    result = crminfos.getJson();
                    openEntity({ objectType: noMatchScreenPopData.toLowerCase() });
                }
            }
        }
        result = crminfos.getJson();
        // Removing it from Map
        if (mapSearchResults.hasOwnProperty(requestId)) {
            delete mapSearchResults[requestId];
        }
        crminfos = null;
        if (operation === 'runQueryandScreenPop') {
            runQueryAndScreenPopCallback(result, params);
        }
        else if (operation === 'cadSearch') {
            cadSearchCallback(result, params);
        }
        else {
            runQueryCallback(result, params);
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : postFinalSearchResults: Exception .. message:' + e.message);
        if (operation === 'runQueryandScreenPop') {
            runQueryAndScreenPopCallback('error:' + e.message, params);
        }
        else if (operation === 'cadSearch') {
            cadSearchCallback('error:' + e.message, params);
        }
        else {
            runQueryCallback('error:' + e.message, params);
        }
    }
}
function retrieveSearchResultsCallback(objectId, operation, requestId, ref) {
    try {
        let resultList = [];
        if (ref.message !== undefined) {
            reportTrace('logDebug', 'customAmcCif : retrieveSearchResultsCallback: Search response received:- ' + ref.message
                + ', Object Id:- ' + objectId + ', RequestId:- ' + requestId);
            reportTrace('logDebug', 'customAmcCif : retrieveSearchResultsCallback message: ' + ref.message);
        }
        if (mapSearchResults.hasOwnProperty(requestId)) {
            resultList = getmapSearchResultsValue(requestId);
        }
        if (ref.results) {
            let singleResult;
            reportTrace('logDebug', 'customAmcCif : retrieveSearchResultsCallback: Search response received:- ' + ref.results.toString()
                + ', Object Id:- ' + objectId + ', RequestId:- ' + requestId);
            for (singleResult in ref.results) {
                if (ref.results.hasOwnProperty(singleResult)) {
                    resultList.push(ref.results[singleResult]);
                }
            }
            mapSearchResults[requestId].searchResults = resultList;
        }
        if (searchLayoutList.length === objectId + 1 || operation === 'cadSearch') {
            reportTrace('logDebug', 'customAmcCif : retrieveSearchResultsCallback: Posting final search results for Request Id :- ' + requestId);
            postFinalSearchResults(resultList, operation, requestId);
        }
        else {
            objectId += 1;
            let objectCounter;
            for (objectCounter in searchLayoutList) {
                if (searchLayoutList.hasOwnProperty(objectCounter)) {
                    const objectValue = searchLayoutList[objectCounter];
                    if (objectValue.id === objectId) {
                        reportTrace('logDebug', 'customAmcCif : retrieveSearchResultsCallback message: Initiating search against:- ' + objectValue.objectname);
                        const filterString = getFilterSystemQueryOption(objectValue, mapSearchResults[requestId].params.queryString);
                        retrieveSearchResults(filterString, objectValue.objectname, objectValue.objectfields, function (objectId2, operation2, requestId2, ref2) { retrieveSearchResultsCallback(objectId2, operation2, requestId2, ref2); }
                            .bind(null, objectValue.id, operation, requestId), function (objectId2, operation2, requestId2, ref2) { retrieveSearchResultsCallback(objectId2, operation2, requestId2, ref2); }
                            .bind(null, objectValue.id, operation, requestId));
                        break;
                    }
                }
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : retrieveSearchResultsCallback: Exception .. message:' + e.message);
        if (operation === 'runQueryandScreenPop') {
            runQueryAndScreenPopCallback('error:' + e.message, mapSearchResults[requestId].params);
        }
        else if (operation === 'cadSearch') {
            cadSearchCallback('error:' + e.message, mapSearchResults[requestId].params);
        }
        else {
            runQueryCallback('error:' + e.message, mapSearchResults[requestId].params);
        }
    }
}
function getmapSearchResultsValue(requestId) {
    return mapSearchResults[requestId].searchResults;
}
function getmapActivityDetailsValue(requestId) {
    return mapActivityDetails[requestId];
}
///////////////////////////////////////////////////////////////////////////////////////////
// The following block of functions handles OnFocus and Click to Dial functionality ///////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////
// Command : DIRECT_CLICK_TO_DIAL = 'registerDirectClickToDial';
// The following functions handles Direct Click to Dial functionality
///////////////////////////////////////////////////////////////////
function registerDirectClickToDialCallback(params) {
    if (typeof params.number !== 'undefined') {
        registerDirectClickToDialCallbackParameters = params;
        onClickToDialByPhoneNumber(params.number);
    }
}
function registerClickToAct() {
    Microsoft.CIFramework.setClickToAct(true);
    Microsoft.CIFramework.addHandler('onclicktoact', function (res) {
        try {
            const clickToDialResult = JSON.parse(res);
            let record;
            for (const objectCounter in searchLayoutList) {
                if (searchLayoutList.hasOwnProperty(objectCounter)) {
                    const objectValue = searchLayoutList[objectCounter];
                    if (objectValue.objectname.toLowerCase() === clickToDialResult.entityLogicalName.toLowerCase()) {
                        record = retrieveObject(clickToDialResult.entityId, objectValue.objectname, objectValue.objectfields, function (res4) {
                            globalRecordForClickToDial = res4;
                            reportTrace('logDebug', 'registerClickToAct - retrieveObject Callback');
                            if (typeof clickToDialResult.value !== 'undefined') {
                                handleClicktoDial(clickToDialResult.value);
                            }
                        }, function () { reportTrace('logError', 'Error in registerClickToAct - retrieveObject'); });
                    }
                }
            }
        }
        catch(ex) {
        reportTrace('logError','customAmcCif.onclicktoact error' + ex.message);
        }

        return Promise.resolve();
    });
}
// Click To Dial by Phone Number
// Input params:
//       PhoneNumber
function onClickToDialByPhoneNumber(result) {
    const response = {
        params: registerDirectClickToDialCallbackParameters,
        response: {
            result: {
                phonenumber: result,
                entity: registerDirectClickToDialCallbackParameters
            }
        }
    };
    reportTrace('logDebug', 'customAmcCif : clickToDialCallback message:' + response);
    postResponse(response);
}
function clickToDialByRecordCallback(result) {
    const response = { params: registerDirectClickToDialCallbackParameters, response: { result: { record: result } } };
    reportTrace('logDebug', 'customAmcCif : clickToDialByRecordCallback message:' + response);
    postResponse(response);
}
///////////////////////////////////////////////////////////////////////////////////////////
function registerClickToDialCallback(params) {
    registerClickToDialCallbackParameters = params;
}
///////////////////////////////////////////////////////////////////////////////////////////
function clickToDialCallback(result) {
    const response = {
        params: registerClickToDialCallbackParameters,
        response: {
            result: result
        }
    };
    reportTrace('logDebug', 'customAmcCif : clickToDialCallback message: ' + JSON.stringify(response));
    postResponse(response);
}
///////////////////////////////////////////////////////////////////////////////////////////
function triggerWhenOnFocus(params) {
    triggerWhenOnFocusParameters = params;
    if (window.IsUSD === true) {
        determineIfNavigationIsValidForFocus(params.id, params.entityName);
    }
    else {
        resetOnFocusVariables();
        Microsoft.CIFramework.addHandler('onpagenavigate', handlePageNavigation);
        reportTrace('logDebug', 'customAmcCif : triggerWhenOnFocus set a periodic timer');
    }
}
function getUrlParameter(name, urlNavigation) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(urlNavigation);
    return results == null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
function handlePageNavigation(eventData) {
    let entityName = '';
    let currentGuid = '';
    try {
        if (eventData) {
            const urlNavigation = JSON.parse(eventData).value;
            if (getUrlParameter('pagetype', urlNavigation) === 'entityrecord') {
                entityName = getUrlParameter('etn', urlNavigation);
                currentGuid = getUrlParameter('id', urlNavigation);
            }
        }
        if (entityName === '' || currentGuid === '') {
            if (!invalidEntityDetected) {
                handleInvalidNavigation();
            }
            return Promise.resolve();
        }
        determineIfNavigationIsValidForFocus(currentGuid, entityName);
    }
    catch(ex) {
    reportTrace('logError','customAmcCif.handlePageNavigation error' + ex.message);
    }

    return Promise.resolve();
}
function resetOnFocusVariables() {
    existingGuid = '';
    onFocusEntityName = '';
    invalidEntityDetected = false;
    onFocusTimerVariable = null;
}
///////////////////////////////////////////////////////////////////////////////////////////
function getRelatedToFields(entityName) {
    let relatedToFields = '';
    const entities = clickToDialLayout.Entities;
    for (let i = 0; i < entities.length; i++) {
        if (entityName === entities[i].Name) {
            if (entities[i].RelatedEntities) {
                for (let j = 0; j < entities[i].RelatedEntities.length; j++) {
                    relatedToFields += entities[i].RelatedEntities[j].FieldName;
                    relatedToFields += ',';
                }
            }
            break;
        }
    }
    // Trim off last comma
    if (relatedToFields !== '') {
        relatedToFields = relatedToFields.substring(0, relatedToFields.length - 1);
    }
    return relatedToFields;
}
///////////////////////////////////////////////////////////////////////////////////////////
function handleClickToDialSearch(entityName, guid) {
    try {
        const clickToDialContext = new ClickToDialContext(guid, entityName);
        if (clickToDialContext.hasRelatedFields()) {
            clickToDialContext.handleMultiSearch();
        }
        else {
            clickToDialContext.handleSingleSearch();
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : handleClickToDialSearch: Exception .. message:' + e.message);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////
function isDeferredResult(record) {
    return typeof record.__deferred !== 'undefined';
}
function getEntityClickToDialLayout(entityName) {
    let entityClickToDialLayout = null;
    const entities = clickToDialLayout.Entities;
    for (let i = 0; i < entities.length; ++i) {
        // requires Name to match schema name in mscrm
        // note: using toLowerCase as a workaround
        if (entities[i].Name.toLowerCase() === entityName.toLowerCase()) {
            entityClickToDialLayout = entities[i];
            break;
        }
    }
    return entityClickToDialLayout; // should return null if not found
}
function extractFieldNameFromDeferredResult(deferredResult) {
    const uri = deferredResult.__deferred.uri;
    let fieldName = null;
    const lastForwardSlashIndex = uri.lastIndexOf('/');
    if (lastForwardSlashIndex !== -1 && uri.length > (lastForwardSlashIndex + 1)) {
        fieldName = uri.substring(lastForwardSlashIndex + 1);
    }
    return fieldName;
}
function getTypeOfRelatedField(relatedField) {
    try {
        Microsoft.CIFramework.getEnvironment().then(function (res) {
            const pageResult = JSON.parse(res);
            if (pageResult.pagetype === 'entityrecord') {
                const currentEntityType = pageResult.etn;
                const layout = getEntityClickToDialLayout(currentEntityType);
                const relatedFieldName = extractFieldNameFromDeferredResult(relatedField);
                if (layout != null) {
                    for (let i = 0; i < layout.RelatedEntities.length; ++i) {
                        if (layout.RelatedEntities[i].FieldName === relatedFieldName) {
                            return layout.RelatedEntities[i].EntityName;
                        }
                    }
                }
            }
        }, function (err) {
            reportTrace('logError', 'customAmcCif : getTypeOfRelatedField: Exception .. message:' + err.message);
        });
        return null; // not found
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : getTypeOfRelatedField: Exception .. message:' + e.message);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////
function getCommaDelimitedListFromArray(array) {
    let commaDelimitedList = '';
    for (let i = 0; i < array.length; ++i) {
        commaDelimitedList += array[i];
        if (i < array.length - 1) {
            commaDelimitedList += ',';
        }
    }
    return commaDelimitedList;
}
function getClickToDialPhoneFields(entityName) {
    const phoneFieldList = [];
    const entities = clickToDialLayout.Entities;
    for (let i = 0; i < entities.length; i++) {
        if (entityName === entities[i].Name) {
            if (entities[i].PhoneFields) {
                for (let j = 0; j < entities[i].PhoneFields.length; j++) {
                    phoneFieldList.push(entities[i].PhoneFields[j].APIName);
                }
            }
            break;
        }
    }
    return phoneFieldList;
}
// returns a comma delimited list including all fields from search layout and
// phone fields from click-to-dial layout for a given entity, with any fields appearing
// in both layouts deduplicated
function getSearchList(entityName) {
    let combinedArray = [];
    const searchFields = getSearchFields(entityName);
    const clickToDialPhoneFields = getClickToDialPhoneFields(entityName);
    combinedArray = searchFields.concat(clickToDialPhoneFields.filter(item => searchFields.indexOf(item) === -1));
    return getCommaDelimitedListFromArray(combinedArray);
}
function getSearchFields(entityName) {
    const searchFields = [];
    const objects = searchLayout.objects;
    for (let i = 0; i < objects.length; i++) {
        if (entityName === objects[i].objectName) {
            if (objects[i].objectFields) {
                for (let j = 0; j < objects[i].objectFields.length; j++) {
                    searchFields.push(objects[i].objectFields[j].APIName);
                }
            }
            break;
        }
    }
    return searchFields;
}
///////////////////////////////////////////////////////////////////////////////////////////
function extractGuid(rawResult) {
    const uri = rawResult['__metadata'].uri;
    const index = uri.indexOf('guid');
    let guid = uri.substring(index + 5);
    guid = guid.substring(0, guid.length - 2);
    return guid;
}
///////////////////////////////////////////////////////////////////////////////////////////
function extractType(rawResult) {
    const type = rawResult['__metadata'].type;
    const arr = type.split('.');
    return (arr[arr.length - 1]);
}
///////////////////////////////////////////////////////////////////////////////////////////
function isSearchableEntity(entityName) {
    const name = getEntityName(entityName);
    if (name === '') {
        reportTrace('logDebug', 'customAmcCif : isSearchableEntity .. name is empty');
        return false;
    }
    return !((getRelatedToFields(name) === '') && (getSearchList(name) === ''));
}
///////////////////////////////////////////////////////////////////////////////////////////
function handleInvalidNavigation() {
    existingGuid = '';
    invalidEntityDetected = true;
    triggerWhenOnFocusCallback('{}');
}
function triggerOnFocus(focusedEntityId, focusedEntityName) {
    try {
        determineIfNavigationIsValidForFocus(focusedEntityId, focusedEntityName);
    }
    catch (e) {
        reportTrace('logDebug', 'customAmcCif.triggerOnFocus: error -> ' + e);
    }
}
function determineIfNavigationIsValidForFocus(focusedEntityId, focusedEntityName) {
    try {
        if (isSearchableEntity(focusedEntityName)) {
            invalidEntityDetected = false;
            if (focusedEntityId !== existingGuid) {
                reportTrace('logDebug', 'customAmcCif : determineIfNavigationIsValidForFocus: focus change detected -> entity id: '
                    + focusedEntityId + '; entity type: ' + focusedEntityName);
                existingGuid = focusedEntityId;
                focusedEntityName = getEntityName(focusedEntityName);
                if (focusedEntityName === '') {
                    reportTrace('logDebug', 'customAmcCif : determineIfNavigationIsValidForFocus: entity name is empty.');
                    if (!invalidEntityDetected) {
                        handleInvalidNavigation();
                    }
                    return;
                }
                // Initiating search details for the Object on Focus
                retrieveOnFocusObject(focusedEntityId, focusedEntityName, 'onFocus');
                // Send Click To Dial request 500 milliseconds later than onFocus Request
                // Timing issues were observed that, the ClickToDial search is happening before OnFocus.
                // On Focus should result first and then only ClickToDial response
                // That way all the clickTodial will be reflected to the OnFocus result
                // On Focus result comming last would result in discarding the prior ClickToDial responses on the Toolbar
                setTimeout(function () { handleClickToDialSearch(focusedEntityName, focusedEntityId); }, 500);
            }
        }
        else {
            reportTrace('logDebug', 'customAmcCif : determineIfNavigationIsValidForFocus: entity not searchable.');
            handleInvalidNavigation();
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : determineIfNavigationIsValidForFocus: error -> ' + e);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////
function getEntityName(name) {
    const objects = searchLayout.objects;
    const ret = '';
    try {
        for (let i = 0; i < objects.length; i++) {
            if (name != null && objects[i].objectName != null) {
                if (name.toLowerCase() === objects[i].objectName.toLowerCase()) {
                    return objects[i].objectName;
                }
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : getEntityName: Exception .. message:' + e.message);
    }
    reportTrace('logDebug', 'customAmcCif : getEntityName failed to find proper objectName');
    return ret;
}
///////////////////////////////////////////////////////////////////////////////////////////
function retrieveObject(ObjectGUID, ObjectName, searchList, callback, errorHandlerMethod) {
    try {
        reportTrace('logDebug', 'customAmcCif : retrieveObject: name= ' + ObjectName + ' guid= ' + ObjectGUID + '  searchList=' + searchList);
        const selectString = '?$select=' + searchList;
        Microsoft.CIFramework.retrieveRecord(ObjectName, ObjectGUID, selectString).then(function success(result) {
            const res = JSON.parse(result);
            callback(res);
        }, function (error) {
            errorHandlerMethod(error);
        });
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : retrieveObject: Exception .. message:' + e.message);
    }
}
///////////////////////////////////////////////////////////////////////////////////////////
function errorHandler(error) {
    reportTrace('logError', 'customAmcCif : errorHandler - for click to dial/onfocus  message:' + error.message);
}
function setLayouts(params) {
    Microsoft.CIFramework.getEnvironment().then(function (res) {
        const pageInfo = JSON.parse(res);
        currentUserId = pageInfo.userId.slice(1, -1);
    }, function (err) {
        reportTrace('logError', err.message);
    });
    searchLayout = params.searchLayout;
    initializeSearchLayoutList(params.searchLayout);
    clickToDialLayout = params.clickToDialLayout;
    processEntityMetadata();
    const response = { params: params, response: { result: 'success' } };
    postResponse(response);
}
function initializeSearchLayoutList(obj) {
    try {
        let objectCounter;
        let counter = 0;
        searchLayoutList.splice(0, searchLayoutList.length);
        for (objectCounter in obj.objects) {
            if (obj.objects.hasOwnProperty(objectCounter)) {
                const objectNameValue = obj.objects[objectCounter].objectName;
                let phoneFieldsValue = '';
                let phoneFieldCounter;
                for (phoneFieldCounter in obj.objects[objectCounter].phoneFields) {
                    if (obj.objects[objectCounter].phoneFields.hasOwnProperty(phoneFieldCounter)) {
                        phoneFieldsValue += obj.objects[objectCounter].phoneFields[phoneFieldCounter].APIName;
                        phoneFieldsValue += ',';
                    }
                }
                phoneFieldsValue = phoneFieldsValue.substring(0, phoneFieldsValue.length - 1);
                let objectFieldsValue = '';
                let objectFieldCounter;
                for (objectFieldCounter in obj.objects[objectCounter].objectFields) {
                    if (obj.objects[objectCounter].objectFields.hasOwnProperty(objectFieldCounter)) {
                        objectFieldsValue += obj.objects[objectCounter].objectFields[objectFieldCounter].APIName;
                        objectFieldsValue += ',';
                    }
                }
                objectFieldsValue = objectFieldsValue.substring(0, objectFieldsValue.length - 1);
                const softphoneLayoutObj = {
                    id: counter, objectname: objectNameValue, phonefields: phoneFieldsValue,
                    objectfields: objectFieldsValue
                };
                searchLayoutList.push(softphoneLayoutObj);
                counter += 1;
            }
        }
        for (const matchType in obj.matchTypes) {
            if (obj.matchTypes.hasOwnProperty(matchType)) {
                const matchTypeDetails = obj.matchTypes[matchType];
                if (matchTypeDetails.screenPopType === 'NoMatch') {
                    noMatchScreenPopData = matchTypeDetails.screenPopData;
                    break;
                }
            }
        }
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif : initializeSearchLayoutList: Exception .. message:' + e.message);
    }
}
function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'), results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return '';
    }
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
function initiate(params) {
    Microsoft.CIFramework.addHandler('onmodechanged', onModeChanged);
    Microsoft.CIFramework.addHandler("onsizechanged", function () { return Promise.resolve(); });
    Microsoft.CIFramework.addHandler("onSessionClosed", function () {
        try {
          verifyAndCreateSession();
        }catch(ex) {
          reportTrace('logError','customAmcCif.onSessionClosed verifyAndCreateSession is sending:' + ex.message);
        }
        return Promise.resolve();
    });
    Microsoft.CIFramework.addHandler("onSessionSwitched", function (event) {
        try {
            let sessionSwitchedData = JSON.parse(event);
            if (sessionSwitchedData.focused) {
                notifyCount = 0;
            }
            reportTrace('logDebug', 'customAmcCif.onSessionSwitched:' + JSON.stringify(event));
        }
        catch (ex) {
            reportTrace('logError', 'customAmcCif.onSessionSwitched error' + ex.message);
        }
        return Promise.resolve();
    });

    try {
        verifyAndCreateSession();
    }
    catch (ex) {
        reportTrace('logError', 'customAmcCif.initiate verifyAndCreateSession is sending:' + ex.message);
    }
    const response = { params: params, response: { result: 'success', softphoneProfile: { 'new_height': 10 } } };
    reportTrace('logDebug', 'customAmcCif.initiate is sending:' + response);
    postResponse(response);
}
function onModeChanged(event) {
    try {
        const eventData = JSON.parse(event);
        if (eventData.value === 0) {
            document.getElementById('body').style.display = 'none';
        }
        else {
            document.getElementById('body').style.display = 'block'; // show
        }
    }
    catch(ex) {
    reportTrace('logError','customAmcCif.onModeChanged error' + ex.message);
    }

    return Promise.resolve();
}
function toolbarInitComplete(params) {
    const response = { params: params, response: { result: 'success' } };
    reportTrace('logDebug', 'customAmcCif.toolbarInitComplete is sending:' + response);
    postResponse(response);
}
function verifyAndCreateSession() {
    Microsoft.CIFramework.setMode(1).then(function (result) {
        return Promise.resolve(result);
    }, function (error) {
        reportTrace('logError', 'customAmcCif.verifyAndCreateSession canCreateSession ' + JSON.stringify(error));
        return Promise.reject(error);
    });
    Microsoft.CIFramework.getAllSessions().then(function success(result) {
        reportTrace('logDebug', result);
        if (result.length <= 0) {
            Microsoft.CIFramework.canCreateSession().then(function (result) {
                if (result) { // If TRUE
                    reportTrace('logDebug', 'customAmcCif.verifyAndCreateSession canCreateSession ' + JSON.stringify(result));
                    let templateName = "DaVinci Agent Session";
                    let queryparamTemplateName = getParameterByName("STName");
                    if (queryparamTemplateName) {
                        templateName = queryparamTemplateName;
                    }
                    let createSessionDetails = {
                        "templateName": templateName,
                        "templateParameters": {}
                    };
                    Microsoft.CIFramework.createSession(createSessionDetails).then(function success(sessionId) {
                        dynamicsSessionId = sessionId;
                        reportTrace('logDebug', 'customAmcCif.verifyAndCreateSession createSession ' + sessionId);
                        // perform operations on session Id retrieved
                    }, function (error) {
                        reportTrace('logError', 'customAmcCif.verifyAndCreateSession createSession error ' + error.message);
                        // handle error conditions
                    });
                }
                else { // FALSE
                    reportTrace('logDebug', 'customAmcCif.verifyAndCreateSession canCreateSession ' + JSON.stringify(result));
                }
                return Promise.resolve(result);
            }, function (error) {
                reportTrace('logError', 'customAmcCif.verifyAndCreateSession canCreateSession ' + JSON.stringify(error));
                return Promise.reject(error);
            });
        }
        else {
            dynamicsSessionId = result[0]; // get First Session
            reportTrace('logDebug', 'customAmcCif.verifyAndCreateSession Current Session ' + JSON.stringify(result) + " " + dynamicsSessionId);
        }
        // perform operations on session info
    }, function (error) {
        reportTrace('logError', 'customAmcCif.verifyAndCreateSession getAllSessions error ' + JSON.stringify(error));
        // handle error conditions
    });
}
function postResponse(response) {
    try {
        if (window.IsUSD != null && window.IsUSD === true) {
            raiseEvent();
        }
        else {
            //dynamicsApi.postResponseFromCif(response);
            window.AmcDynamicsInteractionsAPIpostResponseFromCif(response);
        }
    }
    catch (e) {
        reportTrace('logError', 'postResponse exception, e.message=' + e.message);
    }
}
function handleClicktoDial(params) {
    try {
        const arrayToHandleGlobalRecords = [];
        arrayToHandleGlobalRecords.push(globalRecordForClickToDial);
        const normalizedRecord = parseSearchDataintoCRMInfoClickToDial(arrayToHandleGlobalRecords);
        const message = {
            type: 'interactionApi',
            method: 'registerDirectClickToDial',
            number: params,
            entity: normalizedRecord
        };
        registerDirectClickToDialCallback(message);
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.handleClicktoDial : ' + e.message);
    }
}
function handleCustomEvent(params) {
    try {
        // Write Custom Code to handle Custom Event
    }
    catch (e) {
        reportTrace('logError', 'customAmcCif.handleCustomEvent : ' + e.message);
    }
}
function raiseEvent() {
    USDDataAvailable = true;
    /*
        USD Event mechanism
            Currently all the event data is queued up for USD events to pull at once if they happen to get raised back to back
            Like raising an search result and as well as raising log statement and so on..
            Each of these messages could raise independent events to USD causing multiple events
             to be raised where a single event could get the work done

            A single event raised to USD would pull all the action data pushed to the Queues for processing.
            For this reason below code is kept to wait for an initial (50 milliseconds) before raising
            an event so that any back to back event data can be grouped in the Queue and then raise an event
            In case any other data gets raised after 50 milliseconds to half a second second event would rasie an event.

            And the cycle repeats.


            As Javascript is single threaded this function and setTime out would be sequential and should not cause any race conditions

    */
    if (USDRaiseEventTimer == null) {
        setTimeout(function () {
            if (USDDataAvailable) {
                window.open('amcevent://event/?eventname=AMC_CCA_CCAToolkit_ToolkitToToolbarEvent&param1=' + (new Date()).getTime()
                    + 'Count' + USDEventCounter++);
            }
            USDLastRaiseEventTimeMilli = 0;
        }, 50);
        USDRaiseEventTimer = setTimeout(function () {
            if (USDDataAvailable) {
                window.open('amcevent://event/?eventname=AMC_CCA_CCAToolkit_ToolkitToToolbarEvent&param1=' + (new Date()).getTime()
                    + 'Count' + USDEventCounter++);
            }
            USDRaiseEventTimer = null;
            USDLastRaiseEventTimeMilli = 0;
        }, 550);
        USDLastRaiseEventTimeMilli = Date.now();
    }
    else {
        if (USDLastRaiseEventTimeMilli > 0) {
            const currentMilliseconds = Date.now();
            if ((currentMilliseconds - USDLastRaiseEventTimeMilli) > 2000) {
                // If the wait to send the events has exceeded more than 2 seconds, then cancel the timer and Raise the event
                try {
                    clearTimeout(USDRaiseEventTimer);
                }
                catch (e) {
                    reportTrace('logError', e.message);
                }
                USDRaiseEventTimer = null;
                USDLastRaiseEventTimeMilli = 0;
                window.open('amcevent://event/?eventname=AMC_CCA_CCAToolkit_ToolkitToToolbarEvent&param1=' + (new Date()).getTime()
                    + 'Count' + USDEventCounter++);
            }
            // Else wait for the event timer to expire
        }
    }
}
// End - AMC Standard functionality

// Begin - Custom functionality
// TO DO
// End - Custom functionality

}(window.customAmcCif = window.customAmcCif || {}));
