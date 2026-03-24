package com.sulddara.server.web.controller;

import com.sulddara.server.web.controller.response.SidebarResponse;
import com.sulddara.server.web.domain.Sidebar;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/sidebar")
@RequiredArgsConstructor
public class SidebarController {

    @GetMapping
    public ResponseEntity<List<SidebarResponse>> getSidebar(){
        List<SidebarResponse> response = Arrays.stream(Sidebar.values())
                .map(menu -> new SidebarResponse(menu.getTitle(), menu.getUrl()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
