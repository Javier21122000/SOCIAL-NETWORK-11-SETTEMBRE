package javiertorres.be.repository;
import javiertorres.be.model.Foto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface FotoRepository extends JpaRepository<Foto, UUID> {}
