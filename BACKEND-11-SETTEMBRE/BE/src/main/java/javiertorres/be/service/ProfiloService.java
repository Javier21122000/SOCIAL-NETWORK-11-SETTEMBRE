package javiertorres.be.service;
import javiertorres.be.model.Profilo;
import javiertorres.be.repository.ProfiloRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service
public class ProfiloService {
    private final ProfiloRepository repository;
    public ProfiloService(ProfiloRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public List<Profilo> findAll() { return repository.findAll(); }

    @Transactional(readOnly = true)
    public Profilo findById(UUID id) { return require(id); }

    @Transactional
    public Profilo updateFoto(UUID id, String url) {
        Profilo profilo = require(id);
        profilo.setFotoProfiloUrl(url == null || url.isBlank() ? null : url.trim());
        return repository.save(profilo);
    }

    @Transactional
    public void removeFoto(UUID id) {
        Profilo profilo = require(id);
        profilo.setFotoProfiloUrl(null);
        repository.save(profilo);
    }

    private Profilo require(UUID id) {
        return repository.findById(id).orElseThrow(() -> new NoSuchElementException("Profilo non trovato: " + id));
    }
}
