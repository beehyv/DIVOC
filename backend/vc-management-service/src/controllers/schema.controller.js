const sunbirdRegistryService = require('../services/sunbird.service')
const {getFormData} = require("../utils/utils");
const {ISSUER_NAME} = require("../configs/config");
const {MINIO_URL_SCHEME, MANDATORY_FIELDS, MANDATORY_EVIDENCE_FIELDS} = require("../configs/constants");

async function createSchema(req, res) {
    try {
        const token = req.header("Authorization");
        var schemaRequest = addMandatoryFields(req.body);     
        const schemaAddResponse = await sunbirdRegistryService.createSchema(schemaRequest, token);
        res.status(200).json({
            message: "Successfully created Schema",
            schemaAddResponse: schemaAddResponse
        });
    } catch (err) {
        console.error(err);
        res.status(err?.response?.status || 500).json({
            message: err?.response?.data
        });
    }
}

async function getSchema(req, res) {
    try {
        const token = req.header("Authorization");
        const schemaId = req.params.schemaId;
        const schemaResponse = await sunbirdRegistryService.getSchema(token, schemaId);
        let schemas = schemaId ? [schemaResponse] : schemaResponse
        res.status(200).json({
            schemas: schemas
        });
    } catch (err) {
        console.error(err);
        res.status(err?.response?.status || 500).json({
            message: err?.response?.data
        });
    }
}

async function updateSchema(req, res) {
    try {
        const schemaId = req.params.schemaId;
        const token = req.header("Authorization");
        var schemaRequest = addMandatoryFields(req.body);
        const schemaUpdateResponse = await sunbirdRegistryService.updateSchema(schemaRequest, token, schemaId);
        res.status(200).json({
            message: "Successfully updated Schema",
            schemaUpdateResponse: schemaUpdateResponse
        });
    } catch (err) {
        console.error(err);
        res.status(err?.response?.status || 500).json({
            message: err?.response?.data
        });
    }
}

async function updateTemplate(req, res) {
    try {
        const schemaId = req.params.schemaId;
        const templateKey = req.query.templateKey || "html";
        const token = req.header("Authorization");
        const formData = getFormData(req);
        const uploadTemplateResponse = await sunbirdRegistryService.uploadTemplate(
            formData,
            ISSUER_NAME,
            token
        );
        const uploadUrl = MINIO_URL_SCHEME + uploadTemplateResponse?.documentLocations[0];
        let urlUpdates = {[templateKey]: uploadUrl};
        const templateUpdateResponse = await updateSchemaTemplateUrls(urlUpdates, schemaId, token);
        res.status(200).json({
            message: "Successfully updated Schema",
            templateUpdateResponse: templateUpdateResponse
        });
    } catch (err) {
        console.error(err);
        res.status(err?.response?.status || 500).json({
            message: err?.response?.data
        });
    }
}

async function updateTemplateUrls(req, res) {
    try {
        const schemaId = req.params.schemaId;
        const token = req.header("Authorization");
        const urlUpdates = req.body;
        const templateUpdateResponse = await updateSchemaTemplateUrls(urlUpdates, schemaId, token);
        res.status(200).json({
            message: "Successfully updated Schema with template URLs",
            templateUpdateResponse: templateUpdateResponse
        });
    } catch (err) {
        console.error(err);
        res.status(err?.response?.status || 500).json({
            message: err?.response?.data
        });
    }
}

async function updateSchemaTemplateUrls(urlMap, schemaId, token) {
    const getSchemaResponse = await sunbirdRegistryService.getSchema(token, schemaId);
    let schema = JSON.parse(getSchemaResponse?.schema);
    if (schema?._osConfig) {
        if (!schema._osConfig.certificateTemplates) {
            schema._osConfig.certificateTemplates = {};
        }
        for (const key in urlMap) {
            schema._osConfig.certificateTemplates[key] = urlMap[key];
        }
    }
    const schemaString = JSON.stringify(schema);
    const updateSchemaRequestBody = {"schema": schemaString};
    return await sunbirdRegistryService.updateSchema(updateSchemaRequestBody, token, schemaId);
}

function addMandatoryFields(schemaRequest) {
    const mandatoryFields = MANDATORY_FIELDS;
    const mandatoryEvidenceFields = MANDATORY_EVIDENCE_FIELDS;
    const schemaName = schemaRequest.name;
    var schemaUnparsed = schemaRequest.schema;
    var schema = JSON.parse(schemaUnparsed);

    var reqFields = schema.definitions[schemaName].required;
    addInRequiredFields(reqFields, mandatoryFields, mandatoryEvidenceFields)
  
    var properties = schema.definitions[schemaName].properties;  
    addInProperties(properties, mandatoryFields, mandatoryEvidenceFields)
    
    var credTemp = schema._osConfig.credentialTemplate;
    addInCredentialTemplate(credTemp, mandatoryFields, mandatoryEvidenceFields)

    schemaRequestFinal = {
    "name":schemaName,
    "schema": JSON.stringify(schema)
    }
    return schemaRequestFinal;
}

function addInRequiredFields(reqFields, mandatoryFields, mandatoryEvidenceFields){
    for (let field of mandatoryFields) {
        if (!reqFields.includes(field)) {
            reqFields.push(field);
        }
    };
    for (let field of mandatoryEvidenceFields) {
        if (!reqFields.includes(field)) {
            reqFields.push(field);
        }
    };
    return 
}

function addInProperties(properties, mandatoryFields, mandatoryEvidenceFields){
    for (let field of mandatoryFields) {
        properties[field] = { type : 'string'};
    };
    for (let field of mandatoryEvidenceFields) {
        properties[field] = { type : 'string'};
    };
    return
}

function addInCredentialTemplate(credTemp, mandatoryFields, mandatoryEvidenceFields){
    for (let index = 0; index<mandatoryFields.length; index++) {
        if (!credTemp[mandatoryFields[index]]) {
            if(mandatoryFields[index] === "issuer") {
                credTemp[mandatoryFields[index]] = '{{{'+mandatoryFields[index]+'}}}';
                continue
            } else {
                credTemp[mandatoryFields[index]] = '{{'+mandatoryFields[index]+'}}';
            }          
        }
        
    };
    for (let index = 0; index<mandatoryEvidenceFields.length; index++) {
        credTemp.evidence[mandatoryEvidenceFields[index]] = '{{'+mandatoryEvidenceFields[index]+'}}';
    };
    return
}

module.exports = {
    createSchema,
    getSchema,
    updateSchema,
    updateTemplate,
    updateTemplateUrls
}
