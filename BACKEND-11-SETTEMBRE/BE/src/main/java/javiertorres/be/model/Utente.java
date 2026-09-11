package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Utente {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(unique = true, nullable = false)
    private String username;
    @CreationTimestamp
    private Instant createdAt;
    @OneToOne(mappedBy = "utente", cascade = CascadeType.ALL)
    private Profilo profilo;
    @OneToMany(mappedBy = "utente", cascade = CascadeType.ALL)
    private List<Messaggio> messaggi = new ArrayList<>();
}
