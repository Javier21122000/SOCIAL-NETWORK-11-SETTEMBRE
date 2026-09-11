package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Foto {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String urlFile;
    private UUID utenteId;
    private Instant readAt;
    @ManyToOne
    @JoinColumn(name = "post_id")
    private Post post;
}
