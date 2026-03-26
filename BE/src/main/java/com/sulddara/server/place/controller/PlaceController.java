package com.sulddara.server.place.controller;

import com.sulddara.server.auth.oauth.CustomOAuth2User;
import com.sulddara.server.chat.ai.controller.response.PlaceDetailResponse;
import com.sulddara.server.chat.ai.controller.response.RecommendedPlace;
import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.dto.PlaceSyncRequestDto;
import com.sulddara.server.place.dto.PlaceSyncResponseDto;
import com.sulddara.server.place.service.PlaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

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

    @PostMapping("/sync")
    public ResponseEntity<PlaceSyncResponseDto> syncPlace(@Valid @RequestBody PlaceSyncRequestDto request) {
        PlaceSyncResponseDto response = placeService.syncPlace(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
