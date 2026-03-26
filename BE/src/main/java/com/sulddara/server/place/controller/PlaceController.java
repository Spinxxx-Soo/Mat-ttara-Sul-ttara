package com.sulddara.server.place.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.dto.PlaceUpsertRequestDto;
import com.sulddara.server.place.dto.PlaceUpsertResponseDto;
import com.sulddara.server.place.service.PlaceService;
import com.sulddara.server.place.service.PlaceUpsertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;
    private final PlaceUpsertService placeUpsertService;

    @GetMapping("/search")
    public ResponseEntity<PlaceSearchResponseDto> searchPlaces(
            @RequestParam String keyword,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "distance") String sort) {
        
        PlaceSearchResponseDto response = placeService.searchPlaces(keyword, lat, lng, page, size, sort);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/recommend")
    public ResponseEntity<List<RecommendedPlace>> getRecommendedPlaces(
            @AuthenticationPrincipal CustomOAuth2User user,
            @RequestParam Double lat,
            @RequestParam Double lng
    ) {
        Long userId = user.getUserId();
        var response = placeService.getRecommendedFromRedis(userId, lat, lng);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{placeId}")
    public ResponseEntity<PlaceDetailResponse> getPlaceDetail(@PathVariable Long placeId) {
        var response = placeService.getPlaceDetail(placeId);
        return ResponseEntity.ok(response);
    }

    /**
     * 외부 지도(예: Kakao)에서 내려오는 장소를 DB에 저장하고,
     * 내부 PK인 `places.id`를 반환합니다.
     */
    @PostMapping("/upsert")
    public ResponseEntity<PlaceUpsertResponseDto> upsertPlace(
            @RequestBody @Valid PlaceUpsertRequestDto request
    ) {
        return ResponseEntity.ok(placeUpsertService.upsert(request));
    }
}
