const default_model = "deepseek-v4-flash";

const supported_models = [
    {
        id: "deepseek-v4-flash",
        name: "DeepSeek v4 Flash",
    }
]

function nomalize_model(model) {
    const model = string(value || "").trim();
    return model === "" ? default_model : model;
}

function is_supported_model(model) {
    return supported_models.some((m) => m.id === model);
}

module.exports = {
    default_model,
    supported_models,
    nomalize_model,
    is_supported_model,
};