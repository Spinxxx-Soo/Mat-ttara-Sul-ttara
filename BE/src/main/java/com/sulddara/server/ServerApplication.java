package com.sulddara.server;

import io.github.cdimascio.dotenv.Dotenv;
import io.github.cdimascio.dotenv.DotenvBuilder;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class ServerApplication {

	public static void main(String[] args) {
		loadDotenvIntoSystemProperties();
		SpringApplication.run(ServerApplication.class, args);
	}

	/** Loads {@code .env} into system properties before Spring reads {@code application.yml} (skips keys already in env). */
	private static void loadDotenvIntoSystemProperties() {
		// 실행 위치에 따라 ".env"를 못 찾는 문제를 방지하기 위해
		// (예: 프로젝트 루트에서 bootRun 실행 시) "BE/.env"를 우선 탐색합니다.
		Path beEnv = Path.of("BE", ".env");
		Path localEnv = Path.of(".env");

		DotenvBuilder dotenvBuilder = Dotenv.configure().ignoreIfMissing();
		if (Files.exists(beEnv)) {
			dotenvBuilder = dotenvBuilder.directory("BE");
		}
		// localEnv가 있으면 기본 파일 탐색 로직이 동작하므로 별도 설정 불필요
		Dotenv dotenv = dotenvBuilder.load();
		dotenv.entries().forEach(entry -> {
			String key = entry.getKey();
			if (System.getenv(key) != null) {
				return;
			}
			if (System.getProperty(key) != null) {
				return;
			}
			System.setProperty(key, entry.getValue());
		});
	}

}
