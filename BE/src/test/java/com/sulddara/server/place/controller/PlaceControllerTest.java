package com.sulddara.server.place.controller;

import com.sulddara.server.place.dto.PlaceSearchResponseDto;
import com.sulddara.server.place.service.PlaceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PlaceController.class)
@AutoConfigureMockMvc(addFilters = false)
class PlaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private com.sulddara.server.auth.jwt.JwtUtil jwtUtil;

    @MockitoBean
    private org.springframework.data.redis.core.RedisTemplate<String, String> redisTemplate;

    @MockitoBean
    private PlaceService placeService;

    @Test
    @DisplayName("가게 검색 API - 정상 요청 시 200 OK와 검색 결과를 반환한다")
    void searchPlaces_ShouldReturn200AndResults() throws Exception {
        // given
        String keyword = "카페";
        Double lat = 37.5665;
        Double lng = 126.9780;
        int page = 1;
        int size = 10;
        String sort = "distance";

        PlaceSearchResponseDto.PlaceItemDto item = PlaceSearchResponseDto.PlaceItemDto.builder()
                .placeId(1L)
                .name("테스트 카페")
                .address("서울 중구")
                .lat(lat)
                .lng(lng)
                .rating(4.5)
                .isOpen(true)
                .reviewCount(10)
                .distance(100.0)
                .build();

        PlaceSearchResponseDto.PageInfoDto pageInfo = PlaceSearchResponseDto.PageInfoDto.builder()
                .page(page)
                .size(size)
                .totalElements(1)
                .totalPages(1)
                .hasNext(false)
                .build();

        PlaceSearchResponseDto mockResponse = PlaceSearchResponseDto.builder()
                .content(Collections.singletonList(item))
                .pageInfo(pageInfo)
                .build();

        given(placeService.searchPlaces(anyString(), anyDouble(), anyDouble(), anyInt(), anyInt(), anyString()))
                .willReturn(mockResponse);

        // when & then
        mockMvc.perform(get("/api/v1/places/search")
                        .param("keyword", keyword)
                        .param("lat", String.valueOf(lat))
                        .param("lng", String.valueOf(lng))
                        .param("page", String.valueOf(page))
                        .param("size", String.valueOf(size))
                        .param("sort", sort)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("테스트 카페"))
                .andExpect(jsonPath("$.pageInfo.totalElements").value(1));
    }
}
