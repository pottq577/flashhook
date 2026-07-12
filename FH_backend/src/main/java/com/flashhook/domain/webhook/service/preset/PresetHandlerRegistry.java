package com.flashhook.domain.webhook.service.preset;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class PresetHandlerRegistry {

    private final Map<String, ResponsePresetHandler> responseHandlers;
    private final Map<
        String,
        RequestSigningPresetHandler
    > requestSigningHandlers;

    public PresetHandlerRegistry(
        List<ResponsePresetHandler> responseHandlerList,
        List<RequestSigningPresetHandler> requestSigningHandlerList
    ) {
        this.responseHandlers = responseHandlerList
            .stream()
            .collect(
                Collectors.toMap(h -> h.getPresetType(), Function.identity())
            );
        this.requestSigningHandlers = requestSigningHandlerList
            .stream()
            .collect(
                Collectors.toMap(h -> h.getPresetType(), Function.identity())
            );
    }

    public Optional<ResponsePresetHandler> getResponseHandler(
        String presetType
    ) {
        if (presetType == null) return Optional.empty();
        return Optional.ofNullable(responseHandlers.get(presetType));
    }

    public Optional<RequestSigningPresetHandler> getRequestSigningHandler(
        String presetType
    ) {
        if (presetType == null) return Optional.empty();
        return Optional.ofNullable(requestSigningHandlers.get(presetType));
    }
}
