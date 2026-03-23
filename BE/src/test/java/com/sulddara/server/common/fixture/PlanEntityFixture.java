package com.sulddara.server.common.fixture;

import com.sulddara.server.plan.domain.PlanEntity;
import com.sulddara.server.user.domain.UserEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

public class PlanEntityFixture {

    public static PlanEntity createDefaultPlan(UserEntity user) {
        return new PlanEntity(
                user,
                "기본 플랜",
                LocalDateTime.of(2026, 3, 20, 18, 0),
                4,
                100000L,
                "DINING",
                "테스트 메모",
                "share-token-123"
        );
    }

    public static PlanEntity createPlanWithId(Long id, UserEntity user) {
        PlanEntity plan = createDefaultPlan(user);
        ReflectionTestUtils.setField(plan, "id", id);
        return plan;
    }
}
