package com.sulddara.server;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

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
		Dotenv dotenv = Dotenv.configure()
				.ignoreIfMissing()
				.load();
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
