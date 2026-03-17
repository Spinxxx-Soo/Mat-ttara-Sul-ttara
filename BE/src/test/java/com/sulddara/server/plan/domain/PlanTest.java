package com.sulddara.server.plan.domain;

import com.sulddara.server.user.domain.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Plan 엔티티 유닛 테스트")
class PlanTest {

    @Test
    @DisplayName("플랜 정보 업데이트 - 새로운 값으로 필드가 정상 변경된다")
    void update_validData_updatesFields() {
        // Given
        User user = User.builder().build();
        Plan plan = new Plan(user, "원본 제목", 100000L, 4, LocalDateTime.now(), "회식", "메모", "token");
        
        String newTitle = "수정된 제목";
        LocalDateTime newTime = LocalDateTime.now().plusDays(1);
        int newCount = 6;
        Long newBudget = 150000L;
        String newType = "데이트";
        String newMemo = "수정된 메모";

        // When
        plan.update(newTitle, newTime, newCount, newBudget, newType, newMemo);

        // Then
        assertThat(plan.getTitle()).isEqualTo(newTitle);
        assertThat(plan.getMeetingAt()).isEqualTo(newTime);
        assertThat(plan.getParticipantCount()).isEqualTo(newCount);
        assertThat(plan.getTotalBudget()).isEqualTo(newBudget);
        assertThat(plan.getPlanType()).isEqualTo(newType);
        assertThat(plan.getMemo()).isEqualTo(newMemo);
    }

    @Test
    @DisplayName("소프트 삭제 - deletedAt 필드가 설정된다")
    void softDelete_setsDeletedAt() {
        // Given
        User user = User.builder().build();
        Plan plan = new Plan(user, "제목", 100000L, 4, LocalDateTime.now(), "회식", "메모", "token");
        assertThat(plan.getDeletedAt()).isNull();

        // When
        plan.softDelete();

        // Then
        assertThat(plan.getDeletedAt()).isNotNull();
    }
}
