package javiertorres.be.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor
public class Documento {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String urlFile;
    @Column(columnDefinition = "TEXT")
    private String testoEstrattoOcr;
    @ManyToOne
    @JoinColumn(name = "post_id")
    private Post post;
}
