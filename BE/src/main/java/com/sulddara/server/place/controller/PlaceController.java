package com.sulddara.server.place.controller;

import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
