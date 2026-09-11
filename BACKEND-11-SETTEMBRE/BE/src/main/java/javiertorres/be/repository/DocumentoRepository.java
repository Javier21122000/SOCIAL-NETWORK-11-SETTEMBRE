package javiertorres.be.repository;
import javiertorres.be.model.Documento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface DocumentoRepository extends JpaRepository<Documento, UUID> {}
