package com.sulddara.server.place.service;

import com.sulddara.server.place.domain.PlaceEntity;
import com.sulddara.server.place.dto.PlaceUpsertRequestDto;
import com.sulddara.server.place.dto.PlaceUpsertResponseDto;
import com.sulddara.server.place.repository.PlaceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlaceUpsertService {

    private final PlaceRepository placeRepository;

    @Transactional
    public PlaceUpsertResponseDto upsert(PlaceUpsertRequestDto request) {
        PlaceEntity place = placeRepository.findByProviderAndExternalPlaceId(
                        request.provider(),
                        request.externalPlaceId()
                )
                .map(existing -> {
                    existing.updateFromExternal(
                            request.name(),
                            request.address(),
                            request.lat(),
                            request.lng(),
                            request.category(),
                            request.phone(),
                            request.imageUrl()
                    );
                    return existing;
                })
                .orElseGet(() -> {
                    PlaceEntity created = new PlaceEntity(
                            request.provider(),
                            request.externalPlaceId(),
                            request.name(),
                            request.address(),
                            request.lat(),
                            request.lng()
                    );
                    created.updateFromExternal(
                            request.name(),
                            request.address(),
                            request.lat(),
                            request.lng(),
                            request.category(),
                            request.phone(),
                            request.imageUrl()
                    );
                    return created;
                });

        PlaceEntity saved = placeRepository.save(place);
        return new PlaceUpsertResponseDto(saved.getId());
    }
}

